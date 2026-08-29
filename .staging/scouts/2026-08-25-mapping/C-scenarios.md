# C — Running the store from the future: eight scenarios against the ratified CAS model

Status: **G0, pre-grade scouting evidence.** 2026-08-25. Advisory only — this document has no
design authority and rules nothing. Every claim below carries a `file:line` receipt or verbatim
tool output, or is written as `UNVERIFIED:`. Where a judgment call appears it is phrased as a
question for the operator, with the evidence for each side.

Method: `~/.elan/bin/lake build` green at `formal/entity-store` before any probe (15 jobs,
`Build completed successfully`; `E2/Gates.lean:43` reports `e2 opaque/unsafe gate ok (1217
constants scanned)`). Five probe files sit beside this one and were elaborated with
`lake env lean` from that cwd; their captured stdout is in the matching `.out` files.

| Probe | Covers |
|---|---|
| `probe1_identity.lean` / `.out` | scenarios 1–5, and the schema-embedded-value gap |
| `probe2_store.lean` / `.out` | scenarios 1, 6, 7, 8 — hand-built `Reachable` derivations |
| `probe3_ties.lean` / `.out` | the duplicate-field-name tie |
| `probe4_transport.lean` / `.out` | commutation shape; refs-off-bytes; decidability scope |
| `probe5_mutual.lean` / `.out` | mutual recursion (open ruling R-3) |

The toy hash is `fun b => (⟨b⟩ : Address)` throughout, which is definitionally injective, so
every store-membership fact in `probe2` is discharged from `M8_wf1` + injectivity + `M13_frame`
without evaluating a single encoded byte in the kernel.

---

## Result first

**Eight scenarios ran. Four fall out good, three are tensions, and one is a defect.**

1. **Two things the model does exactly right, lived.** Schema field reorder and entity `vobj`
   field reorder both leave the address unchanged (`probe1.out` S2.a, S3.a), and in both cases
   the *raw* encodings differ, so this is canonicalisation working, not coincidence
   (`probe1.out` S2.b, S3.b). Q11 landed the entity half the same day and it holds.

2. **A defect, kernel-checked.** `canonS` and `canonV` are **not idempotent** — they are
   *involutions* — on a run of equal keys, because `insertField` appends after equals while
   `canonFields` consumes the list right-to-left. `E2/Canon.lean:3` says the sort is "total and
   tie-free — duplicate names are inadmissible", and STORE-MODEL §5 clause 4 does make
   duplicate-freeness an admission clause — but `WFS` (`E2/Model.lean:145-146`) implements only
   `closedB ∧ guardedB`, and `Reachable.putS` (`E2/Model.lean:269`) admits on `WFS`. So the
   offending schema is insertable today. `probe3_ties.lean` proves
   `¬ ObligationCanonIdempotent` and `¬ ObligationCanonVIdempotent` outright, both at
   `[propext, Classical.choice, Quot.sound]` — the estate allowlist. **M1 is false as stated,
   for both kinds.** This is `hash-db-anatomy.md:736-741`'s named failure mode ("Sorting is the
   cheap answer and it has a known failure mode: **ties**") arriving in the scaffold.

3. **Q11 canonicalised values in the entity pre-image but not values embedded in schemas.**
   The same two-field object dedups as an entity value (`probe1.out` G.a `true`) and does *not*
   dedup as a `lit` schema, as a `Check` payload, or as a literal nested in an object field type
   (G.b, G.c, G.d, all `false`) — because `canonS` passes `lit v` and `refine s c` through
   untouched (`E2/Canon.lean:39, 36`). One carrier, two canonical forms, chosen by which node
   carries it. Structurally this is `hash-db-anatomy.md:1004-1008`'s V2 trap ("the same `Hash`
   value encodes two different ways depending on the carrying token") reappearing one layer up.

4. **§17's dedup-for-naming claim does not hold as written.** KICKOFF §17 (`:988`) promises
   "two scenarios converging on the same naming ARE the same entity". `bindings` is an array;
   `canonVList` (`E2/Canon.lean:81-84`) preserves array order; two views with identical bindings
   in swapped order are two entities (`probe2.out` S7.dedup `false`). The same arithmetic breaks
   §16's provenance polynomials, where the merge operation is semiring *addition* and therefore
   commutative (`probe2.out` S8.poly `false`).

5. **A-1 is enough for both forward-looking programs.** The name view (§17) and the trace entity
   (§16 layer 2) are both expressible in the carrier exactly as it stands — `probe2_store.lean`
   builds `Conforms` derivations for both and a full four-step `Reachable` derivation ending in
   the name-view entity. No new constructor is needed. What is *not* there is any typing on
   what an address points at: `Conforms.addr` (`E2/Model.lean:199`) has no premise at all.

6. **Insert order bites exactly where the model says, and it is provable.**
   `B_before_A_illegal` and `B_needs_A_generally` in `probe2_store.lean` show a referencing
   schema cannot precede its referent in *any* store. `refsOfPreimage` reads references back off
   received bytes and rejects garbage (`probe4.out` T.1–T.4), so the input to a topological sort
   exists — but no theorem says a ref-closed *set* of pre-images admits an ordering that makes
   it `Reachable`, and that is precisely what R-15c git-as-transport delivers.

7. **Union order is identity-bearing, including under `oneOf`, where the census records the
   decode outcome as order-*insensitive*.** Evidence both ways; see scenario 4.

8. **`Conforms` is strictly coarser than identity in two places** — it ignores union member
   order and ignores the `mode` byte entirely (`E2/Model.lean:204-205` binds `mode` and never
   uses it). The address distinguishes what the model's own typing judgment cannot.

---

## Scenario 1 — Add an optional field to an object schema

### What the model does (receipt)

`personV1 = { name: string, age: int }`; `personV2` adds `email?: string`.

```
"S1.a addr(personV1) == addr(personV2) = false"
"S1.b |preimageS personV1| = 19"
"S1.b |preimageS personV2| = 28"
```
(`probe1_identity.out`)

The nine added bytes are the field's own framing: `encStr "email"` (one `encNat` frame byte plus
five UTF-8 bytes), the optionality byte, and `[0x30, 0x03]` for `.prim .str` —
`E2/Encode.lean:126-127` and `:111`.

Now the migration story, expressed as store operations. `probe2_store.lean` proves both halves:

- **The old value still conforms to the new schema.** `alice_conforms_V2` is a closed term:
  `.obj (.req (.prim_int 30) (.opt_absent (.req (.prim_str "Alice") .nil)))`. `ConformsF.opt_absent`
  (`E2/Model.lean:217-218`) steps over the absent optional field. No data rewrite is needed.
- **And yet it is a different entity.** `"S1.mig addrE(V1,alice) == addrE(V2,alice) = false"`,
  while `"S1.mig the value halves are byte-identical = true"` (`probe2_store.out`). The two
  pre-images differ only in the `encAddress sAddr` segment (`E2/Obligations.lean:25-26`).

So the store ends up holding two entities whose value bytes are identical, under two schema
addresses. This is STORE-MODEL §5's own line lived out: "the same value at two schemas is two
entities at two addresses" (`docs/entity-store/STORE-MODEL.md:146`).

**The naming plane does nothing**, because there is nothing for it to do. `NameMap` is declared
once (`E2/Model.lean:276`) and referenced nowhere else in the project — verified by
`grep -rn "NameMap" formal/entity-store/`, which returns that line and one README mention. M16
is owed and explicitly *not* a tautology: "M16 names-inert — stated against the shell API
surface, not as a tautology" (`E2/Model.lean:364`). The naming plane in the ratified model is
today a type with no operations.

### What a user would want (argued)

A user migrating a schema wants three things the corpus names precisely.

First, **to know the blast radius before paying it**. `hash-db-anatomy.md:989` states the honest
cost of an encoding change — "any fix here changes every address" — and `:688-691` is the
corpus's only treatment of *localising* a change: content-defined chunking exists precisely
because "insert one byte at the front of a file and every subsequent block shifts, so every
address changes". A schema change here has the un-localised shape: every entity under the schema
gets a new address, and every schema that `.ref`s it gets a new address, transitively.

Second, **to not rewrite data that did not change**. The model already grants this at the
conformance layer (proved above) and denies it at the identity layer. `demand-provenance-survey.md:819-825`
is the corpus passage that names exactly this gap, and it is worth reading in full: change
structures "presume the store *updates* derived artifacts. The append-only store does not
update; it mints a new address. ILC becomes relevant exactly when schema evolution arrives".
The named trigger row is `demand-provenance-survey.md:1365`.

Third, **a migration that is a first-class object, not a script**. `global-projection-survey.md:579-582`
supplies the formalism (Schultz–Spivak–Vasilakopoulou–Wisnesky, `Δ_F(I) := I ∘ F̃`), and
`:1721` records the deferral with its trigger: adopt `Σ ⊣ Δ ⊣ Π` "When the estate needs to
*migrate entities between two schemas* and not merely address them", and when it arrives it
arrives "gated on étale/discrete-opfibration maps … never unrestricted". The survey also
supplies the natural cache key at `:757-759`: `(addr(F), addr(I)) ↦ addr(result)`, "sound
because `Σ_F` is determined up to canonical iso by `(F, I)`".

The name-view entity of §17 is where the *history* of this would live: a view binding
`"Person" ↦ addrPersonV1` and its successor binding `"Person" ↦ addrPersonV2`, each referencing
its predecessor (`KICKOFF.md:986-988`). `probe2_store.lean` shows the carrier can hold that
today. What it cannot hold is any statement that the two targets are *versions of each other* —
the binding is `{name, target}` and nothing more.

### Verdict

**Falls out good on conformance; needs-ruling on identity.** The optional-field case is the
easy one and it works: no rewrite, no re-validation, one new schema address. The question the
operator will have to answer is whether "re-put every entity under the new schema address" is
the migration story for v1, or whether a migration entity (`(from, to, witness)`) enters the
kind enumeration. Nothing here forces it now; the deferral at `global-projection-survey.md:1721`
is well-argued and its trigger has not fired.

---

## Scenario 2 — Field reorder in an object schema (R-10)

### What the model does (receipt)

```
"S2.a addr(personV1) == addr(personV1 reordered) = true"
"S2.b encSchema personV1 == encSchema reordered (raw, pre-canon) = false"
"S2.b canonS personV1 == canonS reordered = true"
```
(`probe1_identity.out`)

The address is unchanged, and the second line is what makes it evidence rather than an
accident: the raw framed encodings of the two field orders are different byte strings, and
`canonS` (`E2/Canon.lean:31-54`, via `insertField` at `:22-28`) is what collapses them. This is
R-10 (`KICKOFF.md:368`) doing its job, and `directionA` (`E2/Obligations.lean:35-37`) is the
proved theorem that turns equal canonical forms into equal addresses.

### What a user would want (argued)

Unambiguously this. The census verified that object property order *is* observable in the pinned
source (`docs/entity-store/research/schema-ast-census.md:710-714` — encoded output order follows
`ast.propertySignatures` order), so R-10 is a deliberate decision to be *coarser* than the
subject's serialisation order for records. The corpus supports it uniformly: DAG-CBOR sorts map
keys byte-wise (`hash-db-anatomy.md:494`), git trees are "a sorted list of (mode, name,
child-address)" (`:113`), NAR uses "directory entries in sorted order" (`:583`).

The one caveat the corpus attaches is the tie (`hash-db-anatomy.md:736-741`), and it is not
hypothetical here — see scenario 9.

### Verdict

**Falls out good.**

---

## Scenario 3 — Entity `vobj` field reorder (Q11, ruled today)

### What the model does (receipt)

```
"S3.a addrE(V1,alice) == addrE(V1,alice reordered) = true"
"S3.b encValue alice == encValue alice_rev (raw, pre-canonV) = false"
"S3.b canonV alice == canonV alice_rev = true"
```
(`probe1_identity.out`)

Ruling date: **2026-08-25 — today** (`docs/entity-store/STORE-MODEL.md:233`, "Value-canonicalization
ruling (Q11, 2026-08-25)"). The second line is the counterfactual: the raw value encodings
differ, so before Q11 — when `preimageE` embedded the value as given — these were two addresses,
exactly as the ruling record states at `STORE-MODEL.md:236-238`. `M12E_dedup`
(`E2/Model.lean:313-317`) is the proved consequence, and it is the same two lines as `M12_dedup`,
which the file itself flags as the point.

### What a user would want (argued)

This one is not close. The ruling record already weighs the alternative — "treating JS own-property
enumeration order as semantics (the mechanical-fidelity reading) — rejected as a host incidental"
(`STORE-MODEL.md:239-241`) — and the census supplies the receipt that the enumeration order is a
JS artefact of iterating `ast.propertySignatures` into a fresh `{}` (`schema-ast-census.md:712-714`).

The deeper argument is the one the operator's own §16 makes: if the entity plane is where
provenance and dedup live, then two agents that independently compute the same record must land
on the same address, or the coefficient-counting story in `demand-provenance-survey.md:1150-1157`
("a hit is the observation that two independently-derived things were the same thing") loses its
subject. Field order in a JS object is not something two independent producers will agree on.

### Verdict

**Falls out good** — and worth recording that it was a same-day catch. The one thing Q11 did not
reach is scenario 9.

---

## Scenario 4 — Union member reorder

### What the model does (receipt)

```
"S4.a addr(anyOf[V1,V2]) == addr(anyOf[V2,V1]) = false"
"S4.a canonS anyOf[V1,V2] == canonS anyOf[V2,V1] = false"
"S4.b addr(anyOf[V1,V2]) == addr(oneOf[V1,V2]) = false"
"S4.c addr(oneOf[V1,V2]) == addr(oneOf[V2,V1]) = false"
```
(`probe1_identity.out`)

Member order is identity-bearing, and so is the `mode` byte (`E2/Encode.lean:116`,
`0x35 :: encUMode m :: …`). `canonS` deliberately leaves `union` order alone
(`E2/Canon.lean:35`, `| .union m ms => .union m (canonList ms)`), as the file's own header
states at `:3-4`.

**But `Conforms` does not observe either.** `E2/Model.lean:204-205`:

```lean
| union_mem {mode ms m v} : SMem m ms → Conforms env m v →
    Conforms env (.union mode ms) v
```

`mode` is bound and never used, and `SMem` (`:189-191`) is plain membership with no positional
information. So the model's typing judgment treats `anyOf[A,B]`, `anyOf[B,A]`, `oneOf[A,B]` and
`oneOf[B,A]` as the same type, while the identity layer gives them four addresses.

### What a user would want (argued)

**For `anyOf`, order-sensitivity is right and the receipt is decisive.** The census established
it first-hand: "**decoding stops at the first member that succeeds**" (`schema-ast-census.md:676-677`),
iteration is in array order, and order sensitivity survives concurrency deliberately
(`:680-685`). There is no sort anywhere in the pinned source; the one `.sort()` at `SchemaAST.ts:2845`
exists to *undo* a `Set`'s insertion order (`schema-ast-census.md:702-703`). The carrier
consequence is stated at `:705-707`: a Lean carrier that canonicalises member order "**changes
decode results**". Being coarser than the subject's semantics is the #3509 shape one level up
(`KICKOFF.md:211-213`), and R-5 was closed on exactly this evidence (`KICKOFF.md:366-367`).

**For `oneOf`, the same census sentence cuts the other way.** `schema-ast-census.md:707-708`:
"Only `mode: "oneOf"` is order-insensitive in outcome (though not in error reporting:
`SchemaIssue.OneOf` and `AnyOf` carry members in encounter order, 3073, 2968)." So under `oneOf`
the address distinguishes two schemas whose *decode outcome* is identical, and the only
observable that separates them is the order members appear in an error. Whether error-report
ordering counts as semantics the address must respect is a live question, not a settled one.

**Now the version-union use case.** A user writing `Person = anyOf [PersonV3, PersonV2, PersonV1]`
wants first-match to prefer the newest, and wants adding V4 at the front to be a real change —
both of which the model gives. What they will also expect, and not get, is that
`anyOf [V1, V2]` and `anyOf [V2, V1]` are *different types* rather than merely different
addresses. Today they are the same type (`union_mem` above) with different addresses. The
corpus's framing of what is at stake is `global-projection-survey.md:147-153`, which calls merge
"the single most transferable idea in the whole survey" and says outright: "The union
constructor's ruling R-5 is the same question in the small." Its answer is that the merge is "a
join in a lattice of local behaviours" — i.e. the natural object here is an ordering on unions
(`:361-363`, the `⊒` relation, "has at least as many branches as"), not an equality.

`global-projection-survey.md:498-503` supplies the design the estate is already half-committed
to: type-based selection, "convey the choice *by the message type itself* rather than a separate
label", which the survey calls "the same instinct as E2's mandatory semantic discriminator".
A version union whose members are `mu`-bound with distinct discriminators is decided by
discriminator, not by position — at which point member order stops mattering *semantically*
while still mattering for identity.

### Verdict

**Tension, and it is a real one, but the tension is in `Conforms`, not in the address.** The
address behaviour is defensible on the census receipt for `anyOf` and arguable for `oneOf`. What
looks wrong is that `Conforms` is strictly coarser than identity in two independent ways at once
(order, and `mode`), which means the model cannot presently state "these two schemas accept the
same values but are different objects" — it just asserts both halves separately and never
relates them. Question for the operator in the final section.

---

## Scenario 5 — Recursive schema via `mu`: discriminator vs body

### What the model does (receipt)

With `intList d = mu d . ( null | { head: int, tail: var 0 } )`:

```
"S5.a addr(mu IntList . B) == addr(mu MyIntList . B)  [rename only] = false"
"S5.b addr(mu IntList . B_int) == addr(mu IntList . B_str)  [body only] = false"
"S5.c closedB 0 (intList) = true"
"S5.c guardedB (intList) = true"
"S5.d guardedB (mu Bad . (null | var 0))  [bare var under union] = false"
```
(`probe1_identity.out`)

Both edits move the address. The discriminator enters the pre-image at `E2/Encode.lean:120`
(`| .mu d body => 0x39 :: (encStr d ++ encSchema body)`), and `canonS` preserves it
(`E2/Canon.lean:37`). S5.d is the guardedness check earning its keep: a bare `var` reachable
through a union spine is rejected by `guardSpineB` (`E2/Model.lean:104-116`), which is what makes
`Conforms`-on-`mu` total by well-founded recursion on value size (`STORE-MODEL.md:148-154`).

### What a user would want (argued)

This is the sharpest "is this the right lived behaviour?" in the set, because the estate has
written down both answers.

**For:** the discriminator is the one *priced* name carve-out (`STORE-MODEL.md:252-253`, "No
names in identity (M16; the discriminator is the one priced carve-out, at the schema layer)"),
and the pricing is deliberate — `KICKOFF.md:208` records `mu`/`var` as "alpha-invariant in the
binder, **discriminator identity-bearing**", and `KICKOFF.md:372-373` records the mandatory
discriminator as "stricter than Effect, recorded as deliberate". The reason it is stricter is
D2 scoped injectivity (`KICKOFF.md:315`): two distinct recursive definitions with structurally
identical bodies must get distinct addresses, and the discriminator is the only thing available
to separate them. Without it, `type Meters = mu . int` and `type Feet = mu . int` are one
address — a nominal/structural collapse the estate has explicitly refused.

**Against:** this is the exact behaviour the corpus flags as a defect elsewhere.
`hash-db-anatomy.md:943-947` records that Concrete's shipped digests "embed binder names, so a
user rename moves every digest", and that Concrete's own roadmap commits to fixing it —
alpha-invariance slice R-0004, status "**PENDING**". `hash-db-anatomy.md:457-459` opens the
#2787 analysis with "Note what leaks: **names**, the exact thing the ABT design erased", and
`:463-465` records the unresolved sibling where constructors "appear to be silently ordered by
name" with no warning at all. Unison's whole position is `LDCS:236-239` — names are "separately
stored metadata that don't affect the function's hash" — and `hash-db-anatomy.md:663-665` states
the lab's own take on the counter-example: "**Do not fuse names into addresses.** … It costs Nix
dedup and it is the opposite of §3.3."

The distinction that reconciles them, and which the estate has already drawn, is that the
discriminator is not a *binder* name — it is a nominal tag, and `var` is de Bruijn
(`E2/Encode.lean:119`, `0x38 :: encNat i`), so binder names genuinely are erased. Renaming the
*variable* is free; renaming the *type* is not. That is the coherent position, and it is
defensible — but it means a user who renames `IntList` to `MyIntList` in their source has
re-minted every schema and every entity beneath it, and no operation in the model tells them so.

### Verdict

**Falls out good, with a documentation debt.** The behaviour is the ratified one and the
argument for it (D2) is sound. What is missing is a stated theorem that binder *variables* are
alpha-invariant — the de Bruijn encoding makes it true by construction, but nothing in the
obligation ledger says so, and it is precisely the claim a reader will want when they see
`hash-db-anatomy.md:943-947` and ask whether the estate has Concrete's problem. **Proposed as a
cheap addition, not a ruling:** an obligation of the shape "`encSchema` does not depend on any
binder name" is vacuous here (there are no binder names in the carrier) — the honest statement
is the negative exhibit that a *discriminator* change does move the address, which
`probe1_identity.lean` S5.a already exhibits.

---

## Scenario 6 — Cross-object references and insert order

### What the model does (receipt)

`schemaB = { label: string, owner: ref addrPersonV1 }`. `probe2_store.lean` builds the whole
chain by hand and proves it:

- `refsS_schemaB : refsS schemaB = [addrPersonV1] := rfl`
- `reach_σ1 : Reachable toyH envR σ1` — A alone.
- `reach_σ2 : Reachable toyH envR σ2` — B on top of A, discharging
  `AllResolve σ1 (refsS schemaB)` by `rw [σ1_find_A]`.
- **`B_before_A_illegal : ¬ AllResolve σ0 (refsS schemaB)`** — B cannot go first.
- **`B_needs_A_generally (σ) (h : AllResolve σ (refsS schemaB)) : (σ.find addrPersonV1).isSome`**
  — and not just on the empty store: *no* store admits B without A.

All elaborate with no errors (`probe2_store.out` shows only the `#eval` lines; the theorems are
silent because they succeeded).

Two things worth separating, because a reader will conflate them:

**`.ref` is a TYPE indirection, not a value pointer.** `Conforms.ref` (`E2/Model.lean:208`)
resolves the address to a schema and requires the value to conform to *that*, inline. Receipt:
`entityB_conforms` in `probe2_store.lean` is `.obj (.req (.prim_str "L") (.req (.ref rfl alice_conforms_V1) .nil))`
— the owner's whole value sits inside the entity — and `refsV_entityB : refsV entityB = [] := rfl`
confirms it contributes no entity-level reference. Value-level sharing is A-1's separate
mechanism (`.address` schema node, `Value.vaddr`), demonstrated in scenario 7.

**Reachability's ordering requirement is exactly the write-order constraint the corpus
derives from acyclicity.** `hash-db-anatomy.md:558-563`, verbatim core: "To make block A link to
block B, A's bytes must contain B's CID, so B must already exist and be hashed." The model gets
the same constraint from `legalInsert`'s closure clause (`STORE-MODEL.md:62-65`) rather than from
a preimage-resistance story — which is STORE-MODEL §3's stated improvement ("made a two-line
induction instead of a cryptographic story", `:76-77`).

### What a user would want (argued): the git-as-transport client

R-15c is ratified (`KICKOFF.md:885`): "the store directory is git-storable; git addresses
transport integrity, SHA3-512 addresses semantic identity; two layers, never conflated."

A `git pull` delivers a **set** of files atomically and unordered. `Reachable` is inherently
**sequential**. The bridge STORE-MODEL §7 joint A specifies is verification-on-open: an
implementation "must *establish* reachability (verify WF1/WF2 on load, or trust its own
append-only history) before the theorems apply — verification-on-open is a spec'd shell
operation, not hand-waving" (`STORE-MODEL.md:210`).

The vocabulary for it exists and works. `probe4_transport.out`:

```
"T.1 refsOfPreimage (preimageS schemaB) == some [addrPersonV1] = true"
"T.2 refsOfPreimage (preimageE addrPersonV1 alice) == some [addrPersonV1] = true"
"T.3 refsOfPreimage (preimageE addrSchemaB annotV) == some [addrSchemaB, addrPersonV1] = true"
"T.4 refsOfPreimage [0xFF, 0xFF, 0xFF] == none = true"
"T.4 refsOfPreimage (wrong version byte) == none = true"
```

`refsOfPreimage` (`E2/Resolve.lean:60-76`) reads references straight off received bytes, heads
the entity list with the schema address, and rejects garbage and wrong version bytes. That is a
complete topological-sort input.

**What is missing is the theorem.** Nothing in the ledger says: *a finite set of pre-images,
each parsing, whose reference sets are contained in the set, admits an ordering under which the
resulting store is `Reachable`.* The OWED block (`E2/Model.lean:354-366`) lists M9, M10,
M11-commutation, M16, M17/M17′ — the converse direction is not among them. M9
(`E2/Resolve.lean:112-116`) is the forward direction: reachable ⇒ closed. The client needs
closed ⇒ reachable-in-some-order.

Two further frictions a syncing client hits, both with receipts:

1. **The entity plane cannot be verified on open today.**
   `ObligationM18_conforms_decidable` (`E2/Model.lean:347-352`) carries the hypothesis
   `(∀ a, env.res a = none)` — decidability is stated only for the *resolver-free* fragment.
   `schemaB` has a `.ref` (`probe4.out` V.1 `true`), so re-checking `Conforms` for an arriving
   entity under a referencing schema is outside every stated obligation. M17′ (resolver
   coherence) is owed (`E2/Model.lean:365`). Note that `probe2_store.lean` had to use a
   *constant* resolver (`envR.res := fun _ => some personV1`) to build its derivations at all —
   which is exactly the incoherence M17′ would forbid, and it is flagged in the probe.

2. **Independent puts do not commute as store values.** `probe4_transport.out`:
   `"L.1 σab == σba (as StoreMap values) = false"` while
   `"L.2 σab.find s1 == σba.find s1 = true"` and likewise for `s2`. `StoreMap` is
   `List (Address × Bytes)` (`E2/Model.lean:234`) and `putPre` conses (`:242-245`), so L-comm
   (`STORE-MODEL.md:102-103`) is true only up to `find`-extensionality. `ObligationM11_put_idem`
   (`E2/Model.lean:341-343`) is stated as a value equality and *is* true in that shape
   (`probe4.out` L.3 `true`), because `putPre` is a genuine no-op on a present address — so the
   idempotence half is fine and only the commutation half needs the weaker equality. Worth
   fixing in the statement before the seat is dispatched rather than after.

The corpus's version of the sync problem is `demand-provenance-survey.md:682-686`, quoting BSLC
§5.3 on sharing constructive traces "with other users, providing cloud-build functionality" via
"a separate **content-addressable cache** which associates hashes with their actual contents".
And `hash-db-anatomy.md:1060` is the reassuring half for concurrent writers: "same address means
same bytes, so a racing duplicate write is harmless". The corpus does **not** contain a
subgraph-transfer algorithm — no git have/want negotiation, no bitswap — so there is no prior
art in-estate to lean on for the ordering theorem.

### Verdict

**Tension — the model is right and the transport story has a named hole.** The ordering
requirement is correct, provable, and matches every system in the corpus. What R-15c needs and
does not have is (a) the closed-set ⇒ reachable-in-some-order theorem and (b) a decidable
`Conforms` over the *referencing* fragment. Both are additions to the owed list rather than
rulings, but the operator should decide whether they block the R-15c transport claim from being
stated at G1.

---

## Scenario 7 — A name-view entity (KICKOFF §17)

### What the model does (receipt)

`probe2_store.lean` constructs the §17 shape as carrier terms and proves conformance:

```lean
def bindingS  := .object (.cons "name" (.prim .str) false (.cons "target" .address false .nil))
def nameViewS := .object (.cons "annotations" (.array .address) false
                         (.cons "base" .address true
                         (.cons "bindings" (.array bindingS) false .nil)))
```

All three are already canonical (`probe2.out` `S7.canon bindingS/nameViewS/nameViewV = true`).
`nameViewV_conforms` is a closed derivation, `refsV_nameViewV : refsV nameViewV = [addrPersonV1] := rfl`,
and `reach_σ4` is a full four-step `Reachable` derivation ending in the name-view entity, with
the binding's target resolved through `σ3_find_A`.

**A-1 suffices.** The carrier as amended (`E2/Core.lean:41` `vaddr`, `:83` `address`) expresses
name views, and WF2 polices their bindings — a typed name view can only name what exists, exactly
as `KICKOFF.md:1002` predicted.

Three things it does **not** give:

1. **`Conforms.addr` has no premise of any kind.** `E2/Model.lean:199`:
   `| addr (a : Address) : Conforms env .address (.vaddr a)`. `probe2_store.lean` proves
   `nameView_may_point_at_a_schema` — the identical view shape binding a name to a *schema*
   address typechecks, and reachability is satisfied because that address does resolve. There is
   no way to write "target must be an entity address", let alone "an entity address under schema
   X". Existence is enforced by `Reachable.putE`'s `AllResolve σ (refsV v)`
   (`E2/Model.lean:272`); kind is enforced nowhere.

2. **Dedup for naming does not hold.** `probe2_store.out`:
   `"S7.dedup addrE(view AB) == addrE(view BA) [same bindings, swapped order] = false"`.
   `bindings` is an `.array`, and `canonVList` (`E2/Canon.lean:81-84`) preserves order by design
   ("array/tuple element order stays semantic", `:12-13`). §17 promises the opposite at
   `KICKOFF.md:988`: "deduplication applies to naming itself — two scenarios converging on the
   same naming ARE the same entity."

3. **No resolution function, and no `NameMap` interaction.** §17 says "'what does this name mean
   here' is resolution against a chosen view, a pure provable function over entities"
   (`KICKOFF.md:985-986`). No such function exists in `formal/entity-store/`. `NameMap` is
   declared and unused (`E2/Model.lean:276`).

### What A-2 still owes

`KICKOFF.md:1003` scopes A-2 as "The name-view schema … its resolution function and
view-composition laws are the first entity-level theorems over the store." Concretely, from what
the probe could and could not build:

- the resolution function `resolve : View → Name → Store → Option Address`, recursing through
  `base`;
- the composition laws (associativity of overlay; a root view is a unit; shadowing is
  left-biased or right-biased — unruled);
- **a canonical ordering discipline for `bindings`**, without which point 2 above stands;
- **a decision on whether `target` is typed**, i.e. whether A-1's `.address` node gains a schema
  argument (`address (s : Address)`) or stays nullary.

### What a user would want (argued)

The corpus is emphatic that the name plane is where the value is, and equally emphatic about the
one thing not to do.

`hash-db-anatomy.md:334-335` states the invariant a user depends on: "**Renaming a definition
produces a new namespace hash. The definition's own hash is untouched.**" `:339-342` describes
Unison's move as "git's refs idea taken further" — the name map is itself content-addressed and
versioned, so "*the history of naming* is a first-class addressable object rather than a mutable
file", and `:824-827` says plainly that this is "the one worth stealing": "what were the names
last Tuesday" becomes a lookup, "not an archaeology expedition". §17 is that design, and the
probe shows the carrier can carry it.

The counter-example is Nix, and the estate has already ruled on it: `hash-db-anatomy.md:603-605`
("**The name is inside the fingerprint**") and `:663-665` ("**Do not fuse names into
addresses.** … It costs Nix dedup"). The model complies — `NameMap` is beside the store
(`STORE-MODEL.md:91`) and M16 is in the ledger.

What a user will want beyond this is the thing `LDCS:288-296` documents Unison struggling with:
because names are chosen at render time and depend on which view you are looking through, "we
don't know the widths of anything in advance", and a printer is "a function from hash to name"
(`LDCS:306-307`) rather than a lookup. That is the price of the design, and it is the right
price — but it means the resolution function A-2 owes is not a convenience, it is the *only*
way a user ever sees a name.

`demand-provenance-survey.md:788-794` supplies the one architectural sentence the surveys have
on naming, and it endorses the split: Adapton's transferable idea is "the inner/outer
stratification, which the store already has in a different guise: **the store (inner, pure,
addressed) and the name layer (outer, mutable, beside the store)**", with the judgment "worth
naming that correspondence in the store's own vocabulary; not worth importing the machinery".

### Verdict

**Falls out good on expressibility; tension on the dedup claim.** A-1 delivers what §17 predicted
it would. The `bindings`-as-array problem is real and shared with scenario 8 — it is the same
root cause and deserves one ruling, not two.

---

## Scenario 8 — A dynamics probe: attaching traces without changing the model

### What the model does (receipt)

`probe2_store.lean` builds §16 layer 2's object exactly as
`demand-provenance-survey.md:723-728` specifies it — "`(out : Address, deps : List Address,
recipe : Address)` — three addresses and a list. That is small enough to be an entity under its
own schema":

```lean
def traceS := .object (.cons "deps" (.array .address) false
                      (.cons "output" .address false
                      (.cons "recipe" .address false .nil)))
```

`traceV_conforms` is a closed derivation. `traceS` and `traceV` are already canonical
(`probe2.out` S8.canon, both `true`). **No new constructor, no model change** — A-1 covered this
case as `KICKOFF.md:1002` predicted ("Unlocks name views, annotation sidecars, and §16's trace
entities … in one stroke").

Where the model **accommodates**:

- Trace entities are ordinary entities. `Reachable.putE` handles them with no special case.
- WF2 gives referential integrity for free: `refsV_traceV : refsV traceV = [addrPersonV1,
  addrSchemaB, addrNameViewS] := rfl`, and `AllResolve` forces all three to resolve.
- `refsOfPreimage` reads a trace's references back off its bytes (`probe4.out` T.3), so a trace
  arriving over transport is screenable.
- Nothing in `Reachable` or the pre-image assembly changes. STORE-MODEL's own forecast holds:
  "Everything in §16 (dynamics) is deferred and attaches *on top of* this model (traces reference
  these addresses) without changing it" (`STORE-MODEL.md:203-204`).

Where the model **resists**, with receipts:

1. **Traces are strictly post-hoc.** `AllResolve σ (refsV v)` (`E2/Model.lean:272`) forces every
   address a trace mentions to already resolve. A trace cannot be forward-declared, and — the
   operational consequence — **heat cannot be shipped ahead of, or independently of, the
   entities it is about**. Under R-15c a heat-only sync to a hub is not a legal `Reachable`
   extension at the hub. Whether that is a feature (integrity) or a problem (§16's
   "heat aggregating upward by semiring merge", `KICKOFF.md:861-862`) is a real question.

2. **Commutative merge and array order are in direct conflict.** §16 layer 2 makes `N[Address]`
   the object and says "Cross-site aggregation is semiring addition: coordination-free by
   algebra" (`KICKOFF.md:910`). Semiring addition is commutative. `probe2_store.out`:

   ```
   "S8.poly addrE(p+q) == addrE(q+p)  [array-of-monomials encoding] = false"
   "S8.poly keyed-by-string: addrE(p+q) == addrE(q+p) = true"
   ```

   Encode a polynomial as an array of `{coeff, term}` monomials and `p + q` and `q + p` are two
   entities. Encode it as a `vobj` keyed by a string and `canonVFields` sorts, so they are one.

   **But the workaround has an exact, provable cost.** `probe2_store.lean`:
   `keyed_poly_has_no_refs : refsV polyKeyedPQ = [] := rfl` versus
   `array_poly_has_refs : refsV polyPQ = [addrPersonV1, addrSchemaB] := rfl`. `refsVF`
   (`E2/Model.lean:64-67`) ignores the key and collects only from values, so an address hidden
   in a key is invisible to WF2. **Today you can have order-insensitive collections or
   reference-closure, not both.** (A redundant encoding — key = hex of the address, value
   carrying the `vaddr` too — recovers both, but nothing in the model enforces the agreement.)

   The corpus predicted the shape: `hash-db-anatomy.md:736-741` — order-insensitivity "has to be
   bought at layer (b) by **sorting**", and sorting's known failure mode is ties.
   `demand-provenance-survey.md:325-329` adds the warning that matters here: keep the store's
   algebra and the provenance algebra distinct, because "**`N[X]` is *not* idempotent,
   deliberately**". A `vobj`-keyed encoding does *not* merge duplicate keys —
   `insertVField` (`E2/Canon.lean:57-63`) appends after equals rather than combining — so two
   monomials over the same address would both survive, which for `N[X]` is arguably correct
   (coefficients add) but is certainly not what the sort does.

3. **Demand-shaped heat is not expressible, and the survey already says why.**
   `KICKOFF.md:874-877` refines heat to be "**demand-shaped, not scalar** … defined at the decode
   judgment". `demand-provenance-survey.md:608-616` states the blocker precisely: "**Nothing in
   the v1 store answers partial reads — decode is all-or-nothing — so there is no demand to
   denote yet.** The entry cost is one datatype (`ValueA`/`SchemaA` with `⊥`) plus a definedness
   order". `E2/Decode.lean`'s `decodeValue` is a total `Bytes → Option Value` with no partiality
   structure — confirmed by its use in `resolveEntity` (`E2/Resolve.lean:42-55`), which either
   returns a whole value or `none`. So layer 3 of §16 is correctly deferred, and the trigger row
   (`demand-provenance-survey.md:1363`) is "the store answers a **partial** read".

4. **R-16a is live and the probe cannot settle it.** `cost-semantics-survey.md:844-857` is the
   source: "**This is a decision the entity store must make before choosing any cost model** …
   does cost count DAG nodes or tree-unfolding paths?" Note that the model's *own* structure
   already votes: `.ref` inlines at the `Conforms` level (scenario 6) while `vaddr` shares, so
   the two reference mechanisms have different cost profiles by construction. `UNVERIFIED: that
   this asymmetry is what R-16a is actually about; checked: cost-semantics-survey.md:844-857 and
   2354-2359 discuss DAG-vs-unfolding for decode/traversal generally and do not mention `.ref`
   vs `vaddr`.` The related standing constraint is `cost-semantics-survey.md:1824`: "**If you
   want cheap cost proofs, do not make decode lazy.**" — which pulls against point 3.

### What a user would want (argued)

`demand-provenance-survey.md:1260-1263` is the argument for storing polynomials rather than
numbers, and it is the strongest single passage: "A number is a `K`-valuation with `K` fixed at
mint time. Fix `K` and you have chosen your question forever … **Storing the polynomial costs
more and answers everything.**" `:1264-1267` rules out the cheaper `Why(X)` for the same reason.
`:1268-1271` rules out keeping the polynomial without the trace: "A polynomial without the trace
it came from cannot be re-derived or audited."

So the user wants trace entities *and* polynomial entities *and* wants them to merge
associatively across sites. The model gives the first two today. The third is what point 2
obstructs.

The ten obligations that would come next are already enumerated —
`demand-provenance-survey.md:1326-1338`, P0 through P9, with P3 (factorization, "the theorem that
licenses 'record once, answer many'") and P5 (GC is a valuation) as the load-bearing ones. None
of them requires a change to the identity layer.

### Verdict

**Tension — the model accommodates the object and obstructs the algebra.** Traces attach cleanly;
polynomials do not, because the store's array order is semantic and semiring addition is
commutative. This is the same root cause as scenario 7's binding-order problem.

---

## Scenario 9 (added) — Values embedded in schemas: the half of Q11 that did not cross over

The corpus suggested this one: `hash-db-anatomy.md:1004-1008` records a V2 trap where "the same
`Hash` value encodes **two different ways** depending on the carrying token". The same shape
exists here one layer up, and Q11 created it by fixing only one side.

### What the model does (receipt)

`probe1_identity.out`:

```
"G.a as ENTITY values: addrE(V1,ab) == addrE(V1,ba) = true"
"G.b as LITERAL SCHEMAS: addr(lit ab) == addr(lit ba) = false"
"G.b canonS (lit ab) == canonS (lit ba) = false"
"G.c CHECK PAYLOAD: addr(refine int (filter between ab)) == addr(... ba) = false"
"G.d literal nested in an object field type: addr == addr = false"
```

One `Value` — `{a: 1, b: 2}` — canonicalises when it is an entity payload and does not when it
sits inside a schema. The cause is two lines: `E2/Canon.lean:39` (`| .lit v => .lit v`) and
`:36` (`| .refine s c => .refine (canonS s) c`, leaving the `Check` untouched). `Check.filter`
carries a `Value` payload (`E2/Core.lean:57`), so every check parameterised by a record has the
same exposure.

### What a user would want (argued)

A user writing `Schema.Literal({ kind: "circle", r: 1 })` and a user writing the same literal
with the keys in the other order have written the same type, by exactly the argument Q11 accepted
for entity values — the enumeration order is a host incidental (`STORE-MODEL.md:239-241`,
`schema-ast-census.md:712-714`). It is hard to see the argument for treating it as semantics on
one side of the kind boundary and not the other.

The counter-argument is real but narrow: `canonS` currently has no dependency on `canonV`, and
`Conforms.lit` (`E2/Model.lean:200`) is `Conforms env (.lit v) v` — literal equality with no
canonicalisation. If `canonS` starts canonicalising `lit` payloads, then a canonical schema's
literal is `canonV v` while a conforming *value* arriving at `putEntity` is also `canonV`-ed
(`E2/Obligations.lean:26`), so the two would still meet — but only because both sides
canonicalise. Today neither does inside a schema, which is at least self-consistent.
`UNVERIFIED: whether `Conforms env (.lit v) w` would remain correct under a canonicalising
`canonS`; checked: E2/Model.lean:200 and E2/Obligations.lean:25-26 — the conformance rule
compares against the schema's stored `v`, and `Reachable.putE` checks `Conforms env s v` on the
RAW value before `preimageE` canonicalises it (E2/Model.lean:271-273), which is the same
raw-vs-canonical transfer gap STORE-MODEL.md:243-246 already books as owed for M17.`

The check-payload half interacts with **open ruling R-4** (`KICKOFF.md:357`, the concrete check-id
allowlist). If the allowlist fixes each check id's payload *shape*, the canonical form of the
payload can be fixed with it, and the problem disappears for checks without touching `canonS`.

### Verdict

**Needs-ruling.** Three options, all cheap: (a) `canonS` recurses into `lit` and `Check.filter`
payloads with `canonV`, making one carrier have one canonical form; (b) `lit` is restricted at
admission to scalar values, so the case cannot arise, with checks handled by R-4's payload
shapes; (c) leave it, and record explicitly that a `Value` has two canonical forms depending on
which kind carries it. **UNVERIFIED: which of these the pinned Effect source makes natural;
checked: schema-ast-census.md — the census records `mode` at `SchemaAST.ts:2916` and object
property order at 710-714, but I did not find a census section on whether `Literal` admits
non-scalar values.**

---

## Scenario 10 (added) — The tie: duplicate field names

This is the defect. It was found by following `hash-db-anatomy.md:736-741`'s warning to its
landing site in the scaffold.

### What the model does (receipt)

`probe3_ties.out`, in full:

```
"D.1 closedB 0 dupSchema = true"
"D.1 guardedB dupSchema = true"
"D.2 canonS dupSchema == dupSchema = false"
"D.2 canonS dupSchema == dupSchemaRev = true"
"D.3 canonS (canonS dupSchema) == canonS dupSchema = false"
"D.3 canonS (canonS dupSchema) == dupSchema = true"
"D.4 addr(dupSchema) == addr(dupSchemaRev) = false"
"D.5 fieldsSortedB (canonFields dup fields) = true"
"D.6 canonS (canonS personV1) == canonS personV1 = true"
"D.7 canonV (canonV dupV) == canonV dupV = false"
"D.7 canonV dupV == dupVRev = true"
'ScoutC3.M1_schema_false' depends on axioms: [propext, Classical.choice, Quot.sound]
'ScoutC3.M1_value_false' depends on axioms: [propext, Classical.choice, Quot.sound]
'ScoutC3.dup_is_reachable' depends on axioms: [propext, Classical.choice, Quot.sound]
```

The mechanism: `insertField` (`E2/Canon.lean:22-28`) inserts *after* all equal keys
(`if key < k then … else .cons k v o (insertField …)`), while `canonFields` (`:45-48`) folds the
list right-to-left. Together they **reverse** a run of equal keys, so applying `canonS` twice
returns the original — D.3 shows both halves. Sortedness is unaffected (D.5), because
`fieldsSortedB` (`:88-92`) tests `!(k₂ < k₁)`, which holds for equal keys. So
`ObligationCanonSorts` survives; `ObligationCanonIdempotent` does not.

Three consequences, each with its own receipt:

- **M1 is false as stated, for both kinds.** `probe3_ties.lean` proves
  `¬ ObligationCanonIdempotent` (`E2/Obligations.lean:58-59`) and `¬ ObligationCanonVIdempotent`
  (`:66-67`), on the allowlist. These are pinned ledger items (`STORE-MODEL.md:165`, M1) and
  Q11's own record commits to `ObligationCanonVIdempotent` at `STORE-MODEL.md:243`.
- **The store admits the offending schema today.** `dup_is_reachable` proves
  `Reachable toyH envR (putSchema toyH [] dupSchema)`. `WFS` (`E2/Model.lean:145-146`) is
  `closedB 0 s = true ∧ guardedB s = true` — the duplicate-free clause of STORE-MODEL §5 clause 4
  (`:124`, "every field-name list duplicate-free") is not implemented. The file's own comment
  says the missing clause is the R-4 allowlist one (`E2/Model.lean:144`, "R-4 allowlist clause
  pending"), which suggests the duplicate-free clause was simply not carried across rather than
  deliberately deferred.
- **`E2/Canon.lean:3`'s justification is currently unsupported by the code.** It reads "object
  fields sort by name (total and tie-free — duplicate names are inadmissible)". They are
  admissible.

The value side is worse in one respect: there is no admission judgment on values at all. Values
are policed only by `Conforms`, and `ConformsF` (`E2/Model.lean:211-218`) matches keys
positionally against the schema's field list, so a duplicate-keyed value cannot conform to a
duplicate-*free* schema — but `ObligationCanonVIdempotent` quantifies over all of `Value`, so the
statement is false regardless of what can be stored.

### What a user would want (argued)

Nobody wants duplicate field names. The question is only what the system does when it meets one,
and the corpus is unusually direct. `hash-db-anatomy.md:736-741`: "Sorting is the cheap answer
and it has a known failure mode: **ties**. Homomorphic hashing is the expensive answer that has
no ties. The lab should know both exist before it writes 'sort by hash' into a spec." And
`:807-809`: "**The cost of admitting cycles is that you owe a total, tie-free canonical order.**"
The estate's own owed-obligation list carries it as item 2 (`hash-db-anatomy.md:1126`).

The corpus also shows what happens when a system does *not* pay: `hash-db-anatomy.md:437-439`
(Unison #2787, ties fall back to `Ord v` order on the names), `:457-459` ("Note what leaks:
**names**"), `:459-461` (the `hashCycle` path "**deliberately discards** the warning"), and
`:463-465` (constructors "appear to be silently ordered by name" with no warning at all). The
present situation is milder — no name leak, because the reversal is deterministic — but it
breaks idempotence, which is a stated theorem, rather than leaking a name, which is not.

### Verdict

**Defect. Not a ruling — a fix.** Cheapest repair: add the duplicate-free clause to `WFS`
(a decidable check on `FieldList`, mirroring `closedB`'s shape), and add the corresponding
hypothesis to `ObligationCanonIdempotent` — or, on the value side, decide whether `canonV` should
merge, reject, or keep duplicate keys, since values have no admission gate to hang a hypothesis
on. Note that making `insertField` stable (insert *before* equals, or fold left-to-right) would
make `canonS` idempotent on ties without any admission change, but would silently accept
duplicate-keyed schemas as well-formed, which is worse.

---

## Scenario 11 (added) — Mutual recursion, for open ruling R-3

R-3 is open (`KICKOFF.md:356`, "Mutual recursion in v1, or single-`mu` only"). Running it:

### What the model does (receipt)

`probe5_mutual.out`:

```
"R3.1 closedB 0 mutualNest = true"
"R3.1 guardedB mutualNest = true"
"R3.2 closedB 0 mutualNestFlipped = true"
"R3.2 guardedB mutualNestFlipped = true"
"R3.2 addr(A-outermost) == addr(B-outermost) = false"
"R3.3 refsS (A refs B) == [B] = true"
```

A mutually recursive pair `A = { b: B }`, `B = null | { a: A }` **is** expressible today as one
nested `mu` reaching past the inner binder with `var 1`, and it is closed and guarded. It is also
expressible with either member outermost, and those are two different addresses for the same
mathematical object.

The alternative — two store objects referring to each other — is unconstructible: each would
need the other's address before its own bytes exist (`hash-db-anatomy.md:558-563`), and WF3
(`STORE-MODEL.md:73-77`) forbids it structurally.

**And the corpus's recommended answer is not expressible in the carrier.**
`hash-db-anatomy.md:803-805`: "**Make the strongly-connected component the unit of addressing.**
One address for the whole group; members named `(component hash, index)`." `E2/Core.lean:80` is
`| ref (a : Address)` — a bare address, no index. There is no way to reference "member 2 of the
component at address X". `hash-db-anatomy.md:920-938` names the precedents (Unison's
`ReferenceId Hash Pos`, Pijul's `(change hash, position)`) and observes that "Git and IPLD did
**not** — they forbid cycles outright, which a language core cannot afford."

### Verdict

**Needs-ruling, and the ruling is more consequential than the R-3 line suggests.** Single-`mu`
does not merely limit expressiveness — it means a mutually recursive group has no canonical
representative, because which member you nest outermost is a free choice that moves the address
(R3.2). If R-3 rules single-`mu`, the estate should say what a user is expected to do with a
mutual pair, and whether the `.ref` constructor gains an index later (which would be a scheme
version, not an amendment, since it changes every encoding —
`hash-db-anatomy.md:989`, "any fix here changes every address").

---

## The hardest tensions — questions for the grilling

Each is stated as a question, with the evidence on both sides. None is a recommendation.

### Q-C1. Should `Conforms` observe what the address observes?

`Conforms` ignores union member order and ignores the `mode` byte entirely
(`E2/Model.lean:204-205`, `mode` bound and unused), while the address distinguishes all four
combinations (`probe1.out` S4.a–c). So the model can say "these are different objects" and cannot
say "these accept different values".

- **For leaving it:** being *finer* in identity than in typing is safe — it never merges two
  things the subject distinguishes, which is the failure #3509 exhibits and which
  `KICKOFF.md:211-213` warns against. And `Conforms` is a *conformance* judgment, not a decode
  simulator; first-match is a decode property, and STORE-MODEL §8 excludes runtime semantics
  outright (`:252`, "No runtime semantics of schemas, values, Effect, or JavaScript").
- **For changing it:** `oneOf`'s exclusivity is not a runtime nicety, it is the constructor's
  defining property — the census shows a second success is an *error*
  (`schema-ast-census.md:661-663`, `SchemaIssue.OneOf` at 3073). A `Conforms` that accepts a
  value matching two `oneOf` members accepts something the subject rejects, which is the
  *coarser*-than-the-subject direction, not the finer one. That is #3509's shape.
- **The question:** is `Conforms` meant to be a sound over-approximation of the pinned decoder,
  or an independent lab-owned judgment that happens to be related to it? The answer determines
  whether the `mode` byte's presence in identity but absence in typing is a gap or a design.

### Q-C2. Is order-insensitivity available to entity values at all, and at what cost to WF2?

Two ratified commitments point opposite ways. §17 promises naming dedup
(`KICKOFF.md:988`); §16 makes cross-site heat merge "coordination-free by algebra" via
commutative semiring addition (`:910`). Both need order-insensitive collections. `canonV` sorts
`vobj` keys and preserves `varr` order (`E2/Canon.lean:66-85`), by explicit design (`:12-13`).

- **Evidence that `vobj`-keying is the answer:** `probe2.out` `"S8.poly keyed-by-string … = true"`.
  It works, it needs no model change, and it is what DAG-CBOR does (`hash-db-anatomy.md:494`).
- **Evidence that it is not:** `keyed_poly_has_no_refs : refsV polyKeyedPQ = [] := rfl`. `refsVF`
  ignores keys (`E2/Model.lean:64-67`), so every address moved into a key leaves WF2's coverage.
  A name view keyed by name would have unpoliced targets; §17's "typed name views can only name
  what exists" (`KICKOFF.md:1002`) would no longer hold.
- **Evidence that a sorted-array constructor is the answer instead:** it keeps `vaddr` in
  `refsV`, and `hash-db-anatomy.md:736-741` says order-insensitivity has to be bought at layer
  (b) by sorting anyway. Cost: a new constructor is a new scheme version, not an amendment
  (`KICKOFF.md:196-198`).
- **Evidence against solving it at all in v1:** `demand-provenance-survey.md:325-329` warns to
  keep the store's algebra and the provenance algebra distinct, and `N[X]` "is *not* idempotent,
  deliberately". A sorted collection that does not merge equal keys (which `insertVField` does
  not — `E2/Canon.lean:57-63`) is not a semiring anyway.
- **The question:** does the store owe an order-insensitive collection, or does it owe only that
  §16 and §17 stop claiming dedup for things it does not provide?

### Q-C3. Should `.address` be typed?

`Conforms.addr` (`E2/Model.lean:199`) has no premise. `probe2_store.lean`'s
`nameView_may_point_at_a_schema` shows a name-view binding pointing at a schema address and
typechecking.

- **For leaving it untyped:** a name view *should* be able to name a schema — that is what
  `"Person" ↦ addrPersonV1` is. A typed address node would need the target schema's address
  inside the referring schema, which makes every schema that mentions an address depend on the
  target's address, propagating exactly the ripple `hash-db-anatomy.md:195-198` describes
  ("every carrier that embeds an address has its encoding perturbed downstream"). And WF2 already
  gives existence, which is the property that matters for integrity.
- **For typing it:** without it, `.address` is `any`, and §17's claim that "typed name views can
  only name what exists" (`KICKOFF.md:1002`) is delivering existence while the word "typed" is
  doing no work. Annotation sidecars, trace entities, and name views would all benefit from
  distinguishing "address of a schema" from "address of an entity under schema X" — and the kind
  distinction alone (`kindSchema`/`kindEntity`, `E2/Obligations.lean:16-17`) is cheap, since M7
  already separates kinds at the pre-image level.
- **The question:** is there a middle rung — `.address` gains a *kind* argument but not a schema
  argument — that buys the useful half without the ripple? Nothing in the corpus addresses it;
  `UNVERIFIED: prior art for kind-tagged-but-not-type-tagged references; checked:
  hash-db-anatomy.md §7.2 and §8.1, which discuss `(component hash, index)` addressing but not
  kind-tagged references.`

### Q-C4. Does R-15c's git-as-transport claim need the closed-set ⇒ reachable theorem before it can be stated?

Git delivers an unordered set; `Reachable` is sequential. `refsOfPreimage` supplies the sort key
(`probe4.out` T.1–T.4). No theorem says a ref-closed set admits a reachable ordering, and it is
not in the OWED list (`E2/Model.lean:354-366`).

- **For requiring it:** STORE-MODEL §7 joint A explicitly promises that verification-on-open is
  "a spec'd shell operation, not hand-waving" (`:210`). Without the theorem, the shell operation
  is specified in prose and unproved, and the store's public claims are all conditional on
  reachability (`:65-66`).
- **For not requiring it:** R-15c as ratified says only that git addresses *transport integrity*
  while SHA3-512 addresses *semantic identity*, "two layers, never conflated"
  (`KICKOFF.md:885`). On that reading the ordering is an implementation concern below the model,
  like GC (`STORE-MODEL.md:201-203`).
- **The sharper half of the question:** the *entity* plane cannot be verified on open at all
  today, because `ObligationM18_conforms_decidable` is stated only for resolver-free environments
  (`E2/Model.lean:351`) and M17′ is owed (`:365`). `probe2_store.lean` had to use a constant
  resolver to build any derivation touching `.ref`. So even granting the "below the model"
  reading, a client cannot re-establish `Reachable` for entities under referencing schemas.
  Is that a blocker for R-15c, or is it simply the next seat?

### Q-C5. Is the entity-per-schema-version explosion the migration story, or a symptom?

Adding an optional field re-mints every entity (`probe1.out` S1.a, `probe2.out` S1.mig) even
though the old values still conform (`alice_conforms_V2`, proved) and the value bytes are
identical.

- **For accepting it:** it is `STORE-MODEL.md:146` working as designed — typing is part of
  identity, which is the model's "distinctive feature" (`:141`). Weakening it means an entity's
  address no longer determines its type, and the typed-reachability theorem M17 loses its
  subject.
- **For treating it as a symptom:** the store now holds two entities whose value halves are
  byte-identical and nothing records that they are the same datum. `demand-provenance-survey.md:819-825`
  names the machinery ("what changed between schema version *n* and *n+1*, and what does that do
  to every entity derived under it") and says explicitly that it "becomes relevant exactly when
  schema evolution arrives". `global-projection-survey.md:1721` names the trigger for `Σ ⊣ Δ ⊣ Π`
  as "when the estate needs to *migrate entities between two schemas* and not merely address
  them" — and this scenario is that, arriving from the mundane direction of one optional field.
- **The question:** has that trigger fired? Scouting says a user adding one optional field to one
  schema hits it on day one, which is earlier than "when schema evolution arrives" sounds. But
  the counter is that the answer may be a *migration entity* under the existing kinds — three
  addresses and a witness, structurally identical to §16's trace object, which `probe2_store.lean`
  shows the carrier already holds — rather than the categorical machinery.

### Q-C6. Which side of the kind boundary should a `Value`'s canonical form be decided on?

Scenario 9: one `Value` canonicalises as an entity payload and does not inside `lit` or a
`Check` payload (`probe1.out` G.a vs G.b/G.c/G.d).

- **For fixing it in `canonS`:** Q11's own reasoning applies unchanged — key order is a host
  incidental (`STORE-MODEL.md:239-241`). One carrier should have one canonical form.
- **For fixing it at admission instead:** restricting `lit` to scalars, and letting R-4's
  allowlist fix each check's payload shape, removes the case without coupling `canonS` to
  `canonV`. It also narrows R-2's constructor set, which is the open ruling that owns `lit`.
- **For leaving it:** `Reachable.putE` checks `Conforms env s v` on the raw value before
  `preimageE` canonicalises (`E2/Model.lean:271-273` and `E2/Obligations.lean:26`), so the
  raw-versus-canonical transfer is *already* an owed bridge (`STORE-MODEL.md:243-246`). Adding
  canonicalisation inside schemas widens that same owed bridge rather than closing it.
- **The question:** does this get folded into R-2/R-4 (admission narrows the carrier so the case
  cannot arise), or into a Q11 follow-on amendment (canonicalisation crosses the kind boundary)?
  It is one decision either way, and it is cheap now and expensive after any schema with a record
  literal is minted.

---

## Standing caveats

- Everything above is about lab-owned definitions in `formal/entity-store/E2/`. Nothing here
  claims anything about the pinned Effect implementation; where the pinned source is invoked, the
  receipt is the census (`docs/entity-store/research/schema-ast-census.md`), which is itself G0
  and whose seven supporting files are noted as not yet in the provenance lock
  (`KICKOFF.md:1012-1015`).
- The toy hash `fun b => ⟨b⟩` is injective by construction. Every probe result that depends on
  injectivity would need a hypothesis under a real digest; none of the *inequalities* reported
  here depends on it (distinct pre-images under an injective toy hash prove the pre-images
  differ, which is the layer-(b) claim; address distinctness under a real `H` is that plus
  collision resistance, which is never claimed — `STORE-MODEL.md:253`).
- The three refutations in `probe3_ties.lean` are kernel-checked at
  `[propext, Classical.choice, Quot.sound]`, the same allowlist `E2/Gates.lean:45-68` reports for
  the proved ledger items. They refute the obligations *as currently stated*; they say nothing
  about whether a hypothesised restatement is true.
- `probe2_store.lean` uses a constant `ConformsEnv.res`, which is incoherent with any store. This
  is flagged in the probe and is exactly what the owed M17′ would forbid; no result in scenario 6
  or 7 turns on the resolver's value except `entityB_conforms`, which is illustrative only.

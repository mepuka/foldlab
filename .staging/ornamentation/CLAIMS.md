# ORNAMENTATION CLAIMS — prover handoff

**Status:** pre-grade claim ledger, 2026-08-30. Nothing here is a proved
ornament theorem. `DERIVED` entries target the current `Cas/*` structures;
`GRAMMAR` entries require a new ornament carrier; `TASTE` entries are refused
as algebraic claims. The prover team should prove, narrow, or refute each row.

**Source:** `.staging/ornamentation/MATHY-DIRECTIONS.md` in the same local
working tree. Its §1 source table is cut into the claims below rather than
repeated. Its §6 sketches are witnesses and falsifier seeds, not extra laws.

## Reading discipline

- A candidate Lean spelling is a theorem target, not an assertion that it
  elaborates today.
- Every name presented as an estate name was found in the current tree.
- `NEEDS-CARRIER` introduces only the minimum new data required to state an
  ornament law. Proposed names are local to this ledger and must not be used as
  if the estate had ratified them.
- `DERIVED` does not mean proved. It means the subject is already an estate
  carrier, even when the target theorem is still owed or is expected to fail.
- A **falsifier shape** is the first concrete counterexample the prover should
  attempt before starting a proof.

## Minimal proposed carriers

The grammar claims cannot be stated against `Cas/*` alone. Area C should first
propose, grill, and only then implement an inductive no larger than this:

```lean
-- NEEDS-CARRIER; all names in this block are provisional.
inductive Ornament where
  | datum (sort : Cas.Grammar.Ty) (claim : String)
  | hole (sort : Cas.Grammar.Ty)
  | seq (left right : Ornament)
  | nest (sort : Cas.Grammar.Ty)
      (edges : List (Cas.Grammar.Ty × Ornament)) (body : Ornament)
  | sum (leftName : String) (left : Ornament)
      (rightName : String) (right : Ornament)
  | guard (body : Ornament)
  | close (address : Cas.Addr32) (body : Ornament)
  | sign (clause : String) (body : Ornament)

inductive OrnamentLayer where
  | foundation | datum | joint | cadence | sign | bloom | lightMotion
```

The laws below additionally need first-order observations, not rendering
library objects: `semanticRefs`, `leaves`, `sorts`, `addresses`, `shape`,
`layers`, `visibleRefs`, and `animated`. A proposed observational equality may
be exactly `x ≈ₒ y :↔ x.leaves = y.leaves ∧ x.shape = y.shape`. It must not
mention DOM nodes, CSS, colour values, or pixels.

View and evidence claims need three small records beside the inductive:

```text
ViewFrame(collection, register, freshness, body)
VerificationReceipt(address, canonicalBytesChecked, digestRecomputed)
GateReceipt(surfaceId, emitterId, expectedBytes, actualBytes)
```

These are minimum statement carriers, not a decision to mint them all.

---

## Claims from §2 — motif derivations

### ORN-1 — one primary mark per binding

- **Source:** §2.1, PL-1.
- **Area:** A LEDGER. **Kind:** GRAMMAR. **Obligation class:** adequacy.
- **Formal claim:** For every `w : Word`, the ordered primary marks of the
  ledger ornament for `w` are in bijection with the positions of `w`; the
  bijection preserves order and sends each mark to exactly the binding at its
  position.
- **Candidate Lean:** **NEEDS-CARRIER** `ledger : Word → Ornament` and
  `primaryBindings : Ornament → List Binding`; target
  `∀ w, primaryBindings (ledger w) = w`.
- **Falsifier:** a two-binding word rendered with one mark, three marks, or the
  two bindings reversed.

### ORN-2 — established resolution survives append

- **Source:** §2.1, PL-2.
- **Area:** A LEDGER. **Kind:** DERIVED. **Obligation class:** preservation.
- **Formal claim:** For all words `w v`, references `r`, addresses `a`, and
  nodes `n`: (i) if `Word.find w a = some n`, then
  `Word.find (w ++ v) a = some n`; and (ii) if
  `Word.resolvesIn w r = true`, then `Word.resolvesIn (w ++ v) r = true`.
- **Candidate Lean:** the existing `Word.find_append_of_some` and
  `Word.resolvesIn_mono` are the exact targets already present.
- **Falsifier:** a suffix whose binding shadows an earlier address and changes
  what `Word.find` returns, or makes a previously resolved reference fail.

### ORN-3 — direct children precede their parent binding

- **Source:** §2.1, PL-3.
- **Area:** A LEDGER. **Kind:** DERIVED. **Obligation class:** ordering.
- **Formal claim:** For every digest function `H`, every sorted tree `tr`, and
  every direct child `c` of `tr`, every binding in `c.flatten H` occurs in
  `tr.flatten H` before the final binding of `tr` itself; direct-child order is
  the constructor order.
- **Candidate Lean:** **NEEDS-CARRIER** only for a helper relation
  `DirectChild : (Σ t, Tree t) → (Σ t, Tree t) → Prop`; alternatively prove
  the constructor equations by cases directly from `Tree.flatten` and avoid
  minting the relation.
- **Falsifier:** a `Tree.parent l r` whose parent binding precedes a binding of
  `l` or `r`, or whose `r` bindings precede `l`.

### ORN-4 — admitted suffix implies admitted prefix

- **Source:** §2.1, PL-4.
- **Area:** A LEDGER. **Kind:** DERIVED. **Obligation class:** invariant.
- **Formal claim:** For all `x y : Word`, if
  `Word.wf (x ++ y) = true`, then `Word.wf x = true`.
- **Candidate Lean:** `theorem Word.wf_prefix {x y : Word}
  (h : Word.wf (x ++ y) = true) : Word.wf x = true := ...` using
  `Word.wfFrom_append`. This is FE-O7 / old ledger L74, not assumed closed.
- **Falsifier:** a word `x ++ y` whose later bindings repair a dangling or
  wrong-kind reference already present in `x`.

### ORN-5 — a duplicate put does not grow the word

- **Source:** §2.1, PL-5.
- **Area:** A LEDGER. **Kind:** DERIVED. **Obligation class:** transition.
- **Formal claim:** For every `H`, node `n`, input word `w`, returned address
  `a`, and output word `w'`, a successful `putWord H n w = .ok (a, w')`
  satisfies `w' = w ∨ w' = w ++ [Binding.mk a n]`; in the core
  `.duplicate a` branch, the first disjunct holds.
- **Candidate Lean:** `putWord_word` is the growth dichotomy; the duplicate
  specialization should be named if the prover team needs it independently of
  the defining cases of `referenceHandler`.
- **Falsifier:** a duplicate input node that appends a second binding.

### ORN-6 — the tree index determines the node tag

- **Source:** §2.2, LS-1.
- **Area:** B SCREEN. **Kind:** DERIVED. **Obligation class:** invariant.
- **Formal claim:** For every digest function `H`, sort `t`, and
  `tr : Cas.Grammar.Tree t`, `(tr.node H).tag = t.wireTag`.
- **Candidate Lean:** existing theorem `Tree.node_tag`.
- **Falsifier:** a constructor whose elaborated node carries a tag different
  from its result index.

### ORN-7 — rendered inlet arity and order equal typed references

- **Source:** §2.2, LS-2.
- **Area:** B SCREEN. **Kind:** GRAMMAR. **Obligation class:** adequacy.
- **Formal claim:** For every `H`, sort `t`, and `tr : Tree t`, the ordered
  inlet sorts of the ornament derived from `tr` equal the ordered
  `expectedTag` values of `(tr.node H).refs`, mapped back through
  `Ty.ofTag`; no additional inlet exists.
- **Candidate Lean:** **NEEDS-CARRIER** `renderTree : Tree t → Ornament` and
  `inletSorts : Ornament → List Ty`; target
  `(inletSorts (renderTree tr)).map Ty.wireTag =
  (tr.node H).refs.map (·.expectedTag)` plus a length equality.
- **Falsifier:** a leaf with an inlet, a unary wrapper with two, or a parent
  whose left and right inlets are exchanged.

### ORN-8 — holes are sort-indexed and fill only at that sort

- **Source:** §2.2, LS-3.
- **Area:** B SCREEN. **Kind:** GRAMMAR. **Obligation class:** domain.
- **Formal claim:** For every sort `t`, `hole t` visibly retains `t`; for every
  `tr : Tree t`, filling that hole with `tr` is defined; and for every
  `s ≠ t` and `tr : Tree s`, filling it is rejected. The unfilled semantic
  value is absence, not a numeric zero.
- **Candidate Lean:** **NEEDS-CARRIER** an indexed `Hole : Ty → Type` or a
  partial `fill : Ornament → (Σ t, Tree t) → Option Ornament`. The `—` text is
  a later renderer test, not part of the theorem.
- **Falsifier:** a `.file` hole accepting a `.schema` tree, or an unfilled hole
  becoming an integer datum.

### ORN-9 — every view frame names its derivation inputs

- **Source:** §2.2, LS-4.
- **Area:** B SCREEN. **Kind:** GRAMMAR. **Obligation class:** provenance.
- **Formal claim:** For every admitted view frame, exactly one collection
  identifier, one register identifier, and one freshness state are present,
  and changing any of those fields changes the frame's first-order
  description.
- **Candidate Lean:** **NEEDS-CARRIER** the minimal `ViewFrame` record stated
  above and a `DecidableEq` instance; no current estate view carrier can state
  this.
- **Falsifier:** two extensionally equal view descriptions that differ in the
  collection, register, or freshness they claim to represent.

### ORN-10 — a signature-sum view preserves sides and brackets

- **Source:** §2.2, LS-5.
- **Area:** B SCREEN. **Kind:** GRAMMAR. **Obligation class:** representation.
- **Formal claim:** For every finite expression built from named atomic
  signatures and binary sum, the view's sum shape is exactly the expression's
  ordered binary tree; in particular the left/right names and every nesting
  boundary are recoverable from the view description.
- **Candidate Lean:** **NEEDS-CARRIER** an inductive `SignatureExpr` with
  `atom` and `sum`, its denotation into `Sig`, and
  `sumShape : Ornament → SignatureExpr.Shape`; require
  `sumShape (renderSignature e) = e.shape`. `Sig` alone does not retain a
  human name, so this cannot be stated from `Sig.sum` alone.
- **Falsifier:** render `(S ⊕ₛ T) ⊕ₛ U` and `S ⊕ₛ (T ⊕ₛ U)` to one identical
  first-order shape.

### ORN-11 — the direction's “L21-L26 remain owed” statement is stale

- **Source:** §1 sum row and §2.2, LS-5.
- **Area:** B SCREEN. **Kind:** DERIVED. **Obligation class:** claim-scope.
- **Formal claim under review:** The current estate has no public theorems
  carrying handler-sum projection, interpretation through `Prog.inl`/`inr`,
  preservation of `pure`/`bind`, or injection injectivity.
- **Candidate Lean:** no theorem should be attempted: `#check
  Handler.sum_handle_inl`, `#check Handler.sum_handle_inr`, `#check
  interpret_inl`, `#check interpret_inr`, `#check Prog.inl_bind`, and `#check
  Prog.inl_injective` already refute the absence claim in
  `Cas/Backend/SumAlgebra.lean`.
- **Falsifier:** the named declarations themselves. Expected disposition:
  **REFUTED AS STALE PROSE**, then revise `MATHY-DIRECTIONS.md`.

### ORN-12 — a light field must carry a boundary meaning

- **Source:** §2.2, LS-6.
- **Area:** B SCREEN. **Kind:** GRAMMAR. **Obligation class:** invariant.
- **Formal claim:** For every light-field node in an admitted ornament, its
  semantic reference is exactly one of: projection boundary, typed boundary,
  suspension boundary, or cached-view extent; there is no unlabelled
  light-field constructor.
- **Candidate Lean:** **NEEDS-CARRIER** either a `BoundaryKind` argument on a
  `light` constructor or a separate first-order placement record. The minimal
  `Ornament` above intentionally omits `light` until this choice is grilled.
- **Falsifier:** a pale field with no boundary witness, added only as card
  elevation.

### ORN-13 — the tree's own binding is the final flatten entry

- **Source:** §2.3, TB-1.
- **Area:** C BLOOM+GRAMMAR. **Kind:** DERIVED. **Obligation class:** ordering.
- **Formal claim:** For every `H`, sort `t`, and `tr : Tree t`,
  `(tr.flatten H).getLast? =
  some (Binding.mk (tr.address H) (tr.node H))`.
- **Candidate Lean:** this is old ledger L82. It should be proved by cases from
  `Tree.flatten`; `Tree.self_mem_flatten` is weaker and does not discharge it.
- **Falsifier:** any constructor whose own binding is present but not last.

### ORN-14 — the guardedness checker decides absence of bare cycles

- **Source:** §2.3, TB-2.
- **Area:** C BLOOM+GRAMMAR. **Kind:** DERIVED. **Obligation class:** adequacy.
- **Formal claim:** For every `d : Cas.Schema.Document`,
  `d.guarded = true ↔ d.Guarded`, where `d.Guarded` is `¬ d.Cyclic` and
  `d.Cyclic` is a nonempty cycle of `Document.Edge` generated through
  `Ast.bareRefs`.
- **Candidate Lean:** existing theorem `references_guarded_decidable`; the
  constructor equation `bareRefs_susp` is the guard lemma.
- **Falsifier:** an unguarded reference cycle accepted by `d.guarded`, or an
  acyclic bare-edge table rejected by it.

### ORN-15 — guardedness does not imply productive forcing

- **Source:** §2.3, TB-3.
- **Area:** C BLOOM+GRAMMAR. **Kind:** DERIVED. **Obligation class:**
  claim-scope/termination.
- **Formal claim:** There exists a document `d` such that `d.Guarded` holds
  while forcing or validating the recursively revived schema represented by
  `d` does not terminate or does not produce a value.
- **Candidate Lean:** **NEEDS-CARRIER** `Productive : Document → Prop` or a
  forcing step relation with an explicit termination observation. Until that
  exists, only the narrower statement “`references_guarded_decidable` proves
  no productivity proposition” is internal to Lean. Candidate witnesses are
  the documents described in `Guarded.lean` with
  `A = susp (reference A)` and its union form.
- **Falsifier:** a theorem `∀ d, d.Guarded → Productive d` for a correctly
  modeled forcing semantics, or failure of every named witness to be guarded.

### ORN-16 — motif reuse is keyed only by the full address

- **Source:** §2.3, TB-4.
- **Area:** C BLOOM+GRAMMAR. **Kind:** GRAMMAR. **Obligation class:** identity.
- **Formal claim:** For every ornament cache and every full address `a`, reuse
  lookup is a function of `a`; no short prefix or geometric similarity enters
  the key. Distinct addresses may still map to equal geometry, but they remain
  distinct cache entries.
- **Candidate Lean:** **NEEDS-CARRIER** `MotifCache` as a finite map or pure
  function from `Addr32` to motif identifiers, plus an explicit lookup
  relation. Do not claim address injectivity; L99 forbids that shortcut.
- **Falsifier:** two distinct `Addr32` values with a common displayed prefix
  collapsing to one cache entry.

### ORN-17 — completion and unsettled standing use disjoint accents

- **Source:** §2.3, TB-5.
- **Area:** C BLOOM+GRAMMAR. **Kind:** GRAMMAR. **Obligation class:**
  separation invariant.
- **Formal claim:** For every presentation standing, an admitted/completed
  root has the neutral completion sign and no unsettled accent; every
  `owed`, `refused`, or `stale` standing has the unsettled accent and no
  completion sign.
- **Candidate Lean:** **NEEDS-CARRIER** a ruled `PresentationStanding` sum and
  an `AccentClass` sum. Existing `Status`, `Refusal`, and freshness states are
  different carriers and must not be silently merged to state this theorem.
- **Falsifier:** one standing classified as both completed and unsettled, or an
  `owed` standing classified neutral.

---

## Claims from §3 — accent adequacy

### ORN-18 — copied address text is the full address

- **Source:** §3, Addressed.
- **Area:** B SCREEN. **Kind:** GRAMMAR. **Obligation class:** identity.
- **Formal claim:** For every `a : Addr32`, the copied address rendering has
  exactly 64 lowercase hexadecimal characters and parses back to `a`; a row
  abbreviation is not accepted as copy output or as identity.
- **Candidate Lean:** **NEEDS-CARRIER** a canonical address-text encoder and
  decoder; no current Lean declaration name is assumed for them.
- **Falsifier:** two distinct addresses with the same copied string, or a copy
  result shorter than 64 characters.

### ORN-19 — verified-here appears only with a verification receipt

- **Source:** §3, Verified-here.
- **Area:** B SCREEN. **Kind:** GRAMMAR. **Obligation class:** evidence.
- **Formal claim:** For every view row and address, the `verified-here` sign is
  present if and only if the row carries a receipt for that address with both
  canonical-byte checking and digest recomputation recorded as successful.
- **Candidate Lean:** **NEEDS-CARRIER** `VerificationReceipt` and a relation
  between receipts and sign placements. Host gate L195 supplies evidence, not
  this first-order carrier.
- **Falsifier:** a marked row with no receipt, or a complete receipt whose row
  lacks the mark.

### ORN-20 — gated accent attaches to the gated surface

- **Source:** §3, Gated.
- **Area:** B SCREEN. **Kind:** GRAMMAR. **Obligation class:** evidence scope.
- **Formal claim:** For every gate receipt and rendered surface, the gated
  accent is attached exactly to the surface named by the receipt; it is not
  inherited by arbitrary values merely displayed inside that surface.
- **Candidate Lean:** **NEEDS-CARRIER** `GateReceipt`, surface identity, and a
  placement relation. Byte equality gate L230 alone does not state placement.
- **Falsifier:** one gated container causing an unrelated or hand-authored
  child value to acquire the gated mark.

### ORN-21 — owed accent names one exact unsupported claim

- **Source:** §3, Owed.
- **Area:** C BLOOM+GRAMMAR. **Kind:** GRAMMAR. **Obligation class:**
  claim-scope.
- **Formal claim:** For every owed sign, there exists exactly one claim
  reference it qualifies; removing or moving the sign changes which claim is
  unsupported, and no container-level owed sign implicitly qualifies all
  descendants.
- **Candidate Lean:** **NEEDS-CARRIER** a nonempty `ClaimRef` and a placement
  relation from `sign` to the addressed subornament.
- **Falsifier:** one owed sign attached to a card containing two independent
  claims with no way to tell which is owed.

### ORN-22 — receipt marks agree with actual word growth

- **Source:** §3, Receipt.
- **Area:** A LEDGER. **Kind:** GRAMMAR. **Obligation class:** adequacy.
- **Formal claim:** For every run receipt with resulting word suffix `v`, the
  receipt's primary admitted marks correspond positionally to `v`; a
  successful duplicate attempt may produce a secondary hollow notch but no
  primary admitted mark.
- **Candidate Lean:** **NEEDS-CARRIER** a receipt event type distinguishing
  attempted lines from admitted bindings, plus `primaryBindings`. The suffix
  should be obtained through existing `since_next`, not recomputed from a
  private UI history.
- **Falsifier:** a duplicate attempt increasing the count of primary marks, or
  `since` returning three bindings while the receipt shows two.

### ORN-23 — refusal signs are total and clause-preserving

- **Source:** §3, Refusal.
- **Area:** C BLOOM+GRAMMAR. **Kind:** GRAMMAR. **Obligation class:** adequacy.
- **Formal claim:** For every `Cas.Lang.Refusal` and every
  `Cas.Schema.IngestRefusal`, the corresponding sign retains the exact
  constructor and its carried data; no catch-all sign or untyped warning
  branch exists.
- **Candidate Lean:** **NEEDS-CARRIER** total functions from each closed
  refusal family into a first-order sign descriptor, plus an inverse
  `signClause` theorem. Keep the two refusal families separate.
- **Falsifier:** add or select `.unguardedCycle` and observe a generic warning
  descriptor indistinguishable from `.illFormed`.

### ORN-24 — suspension signs correspond to actual `Ast.susp`

- **Source:** §3, Suspension.
- **Area:** C BLOOM+GRAMMAR. **Kind:** GRAMMAR. **Obligation class:** adequacy.
- **Formal claim:** For every schema path shown as crossing a suspension sign,
  the corresponding path in the source `Ast` crosses at least one `.susp`;
  every source `.susp` selected for close-resolution rendering contributes one
  visible suspension sign.
- **Candidate Lean:** **NEEDS-CARRIER** a path relation over `Ast` and a
  schema-to-ornament projection. `Ast.bareRefs` intentionally erases what lies
  below `.susp`, so it is insufficient by itself for the reverse direction.
- **Falsifier:** an unguarded `.reference` edge receiving a suspension sign, or
  a rendered guarded return whose source path has no `.susp`.

---

## Claims from §4.2 — ornament composition

### ORN-25 — every admitted ornament carries a semantic reference

- **Source:** §4.2, G1.
- **Area:** C BLOOM+GRAMMAR. **Kind:** GRAMMAR. **Obligation class:** invariant.
- **Formal claim:** For every admitted ornament `o`, `semanticRefs o` is
  nonempty; every leaf reference is a sort, edge, address, clause, collection,
  or claim, and composite constructors contribute only their own reference or
  those of their children.
- **Candidate Lean:** **NEEDS-CARRIER** `semanticRefs` and
  `Ornament.WF`; target `∀ o, o.WF → o.semanticRefs ≠ []`.
- **Falsifier:** a well-formed ornamental node with no semantic reference.

### ORN-26 — sequence flattening preserves left-to-right order

- **Source:** §4.2, G2.
- **Area:** A LEDGER. **Kind:** GRAMMAR. **Obligation class:** homomorphism.
- **Formal claim:** For all ornaments `x y`,
  `leaves (Ornament.seq x y) = leaves x ++ leaves y`.
- **Candidate Lean:** **NEEDS-CARRIER** `leaves`; the equation should be a
  constructor theorem, preferably `rfl`.
- **Falsifier:** a `seq x y` whose leaf observation sorts, deduplicates, or
  reverses the two sides.

### ORN-27 — word-like sequence regrouping preserves observation

- **Source:** §4.2, G3, first sentence.
- **Area:** C BLOOM+GRAMMAR. **Kind:** GRAMMAR. **Obligation class:**
  observational equivalence.
- **Formal claim:** For all ornaments `x y z` that are certified as
  word-cadence ornaments,
  `seq (seq x y) z ≈ₒ seq x (seq y z)` at the ordered-leaf observation; no
  equality of ornament syntax is claimed.
- **Candidate Lean:** **NEEDS-CARRIER** a `WordCadence` predicate and
  observation `≈ₒ`. If `shape` records grouping, use a weaker
  `leafEq` here rather than the full `≈ₒ` proposed above.
- **Falsifier:** regrouping changes leaf order or drops a binding; a second
  falsifier is an observation definition so strong that the intended theorem
  becomes false merely because brackets differ.

### ORN-28 — signature-sum regrouping is not an ornament equivalence

- **Source:** §4.2, G3, second sentence.
- **Area:** B SCREEN. **Kind:** GRAMMAR. **Obligation class:** negative law.
- **Formal claim:** For every three distinct named atomic signature
  expressions `S T U`, the sum-shape observations of
  `(S ⊕ T) ⊕ U` and `S ⊕ (T ⊕ U)` are unequal.
- **Candidate Lean:** **NEEDS-CARRIER** `SignatureExpr` and its recoverable
  `Shape`; prove inequality by constructor discrimination. This is a law of
  the visual syntax, not a theorem that no signature isomorphism can exist.
- **Falsifier:** a shape observation that flattens both expressions to the same
  three-name list.

### ORN-29 — nesting reproduces store edge arity and order

- **Source:** §4.2, G4.
- **Area:** B SCREEN. **Kind:** GRAMMAR. **Obligation class:** adequacy.
- **Formal claim:** For every `H`, `t`, and `tr : Tree t`, the ordered edges of
  `renderTree tr` have the same length and wire tags as `(tr.node H).refs`, in
  the same order.
- **Candidate Lean:** same minimal projection and `inletSorts` as ORN-7;
  ORN-29 is the end-to-end theorem, while ORN-7 fixes the view invariant.
- **Falsifier:** an `entry` rendering that swaps item and previous-entry edges.

### ORN-30 — repetition requires a list witness

- **Source:** §4.2, G5.
- **Area:** A LEDGER. **Kind:** GRAMMAR. **Obligation class:** domain.
- **Formal claim:** Every repeated cadence in an admitted ornament is indexed
  by the positions of one explicit source list, and its repetitions are in
  bijection with those positions. No scalar value alone admits repetition.
- **Candidate Lean:** **NEEDS-CARRIER** a dependent collection witness
  `Σ α, List α` attached to cadence construction, or separate projections for
  `Word`, `PProg`, refs, fields, and members. Do not invent one untyped
  “repeat count” detached from a carrier.
- **Falsifier:** an address or status producing three decorative repeats with
  no list source.

### ORN-31 — append-only growth extends the existing ledger rendering

- **Source:** §4.2, G6.
- **Area:** A LEDGER. **Kind:** GRAMMAR. **Obligation class:** preservation.
- **Formal claim:** For all words `w v`, the primary marks of `ledger (w ++ v)`
  have `primaryBindings (ledger w)` as an exact prefix, and the remaining
  marks correspond exactly to `v`.
- **Candidate Lean:** **NEEDS-CARRIER** `ledger` and `primaryBindings`; target
  follows from ORN-1. For the language-facing fetch, existing
  `since_next` states that `since w.length` over state `w ++ v` answers exactly
  `v` without changing state.
- **Falsifier:** appending one binding changes any earlier primary mark or
  returns a suffix other than the new binding.

### ORN-32 — sum rendering is shape-preserving

- **Source:** §4.2, G7, first two clauses.
- **Area:** B SCREEN. **Kind:** GRAMMAR. **Obligation class:** representation.
- **Formal claim:** For every `SignatureExpr`, rendering followed by
  `sumShape` returns the original ordered, bracketed expression shape.
- **Candidate Lean:** **NEEDS-CARRIER** as ORN-10; target
  `∀ e, sumShape (renderSignature e) = e.shape`.
- **Falsifier:** loss of an injection side or bracket in a nested expression.

### ORN-33 — sum rendering is not commutative

- **Source:** §4.2, G7, “no symmetry”.
- **Area:** B SCREEN. **Kind:** GRAMMAR. **Obligation class:** negative law.
- **Formal claim:** For all distinct named atom expressions `S T`,
  `sumShape (renderSignature (sum S T)) ≠
  sumShape (renderSignature (sum T S))`.
- **Candidate Lean:** **NEEDS-CARRIER** `SignatureExpr`; constructor
  discrimination plus name inequality should close it.
- **Falsifier:** a rendering that alphabetizes or otherwise swaps sum arms.

### ORN-34 — the ornament sum has no implicit empty arm

- **Source:** §4.2, G7, “no neutral empty bay”.
- **Area:** B SCREEN. **Kind:** GRAMMAR. **Obligation class:** domain.
- **Formal claim:** Every ornament sum contains exactly two present named
  operands; there is no constructor or elaboration rule that supplies an
  omitted operand as a neutral element.
- **Candidate Lean:** **NEEDS-CARRIER** the `Ornament.sum` constructor above;
  this should hold by constructor shape, not by proving a nonexistent unit law
  for `Sig.sum`.
- **Falsifier:** a parsed or generated sum with a missing side that is accepted
  as equivalent to its only present child.

### ORN-35 — recursive ornament closure agrees with guardedness

- **Source:** §4.2, G8.
- **Area:** C BLOOM+GRAMMAR. **Kind:** GRAMMAR. **Obligation class:** adequacy.
- **Formal claim:** For every document `d`, the schema ornament projected from
  `d` contains no closed return made entirely of unguarded edges if and only if
  `d.Guarded`; if `¬ d.Guarded`, the projection contains a refusal sign whose
  clause is `IngestRefusal.unguardedCycle` rather than a closed return.
- **Candidate Lean:** **NEEDS-CARRIER** the schema path projection,
  `ornamentGuarded`, and refusal-sign observation; target
  `ornamentGuarded (renderDocument d) ↔ d.Guarded`, plus a failure theorem.
- **Falsifier:** an unguarded cyclic document rendered with a closed return, or
  a guarded document rendered as `.unguardedCycle`.

### ORN-36 — root closure carries the exact full address

- **Source:** §4.2, G9, first clause.
- **Area:** C BLOOM+GRAMMAR. **Kind:** GRAMMAR. **Obligation class:** identity.
- **Formal claim:** For every `H`, `t`, and `tr : Tree t`, the unique close
  node in `renderTree tr` carries `tr.address H`, not a prefix, label, or
  independently recomputed presentation identifier.
- **Candidate Lean:** **NEEDS-CARRIER** `closeAddresses`; target
  `closeAddresses (renderTree tr) = [tr.address H]`.
- **Falsifier:** a close node holding only the first bytes of the address or a
  different address.

### ORN-37 — root closure follows all child marks

- **Source:** §4.2, G9, second clause.
- **Area:** A LEDGER. **Kind:** GRAMMAR. **Obligation class:** ordering.
- **Formal claim:** For every rendered tree, the root-close leaf is after all
  leaves corresponding to bindings of every direct child.
- **Candidate Lean:** **NEEDS-CARRIER** `renderTree`, `leaves`, and the helper
  relation of ORN-3; discharge from ORN-3 and ORN-13.
- **Falsifier:** a rendered parent whose bloom precedes its right child.

### ORN-38 — non-done statuses keep the cap open

- **Source:** §4.2, G9, third clause.
- **Area:** C BLOOM+GRAMMAR. **Kind:** GRAMMAR. **Obligation class:** state.
- **Formal claim:** For every signature `S`, result type `A`, and
  `s : Status S A`, if `s` is `.running _` or `.refused _`, then its status
  ornament contains no completion close. The converse is not claimed: `.done`
  alone does not supply a tree address.
- **Candidate Lean:** **NEEDS-CARRIER** `statusOrnament` and `hasCompletion`;
  prove by cases on the real `Status`.
- **Falsifier:** a `.running` or `.refused` status displaying a terminal close.

### ORN-39 — animation implies running status

- **Source:** §4.2, G10, first sentence.
- **Area:** C BLOOM+GRAMMAR. **Kind:** GRAMMAR. **Obligation class:**
  claim-scope/state.
- **Formal claim:** For every `S`, `A`, and `s : Status S A`, if the status
  ornament is animated, then `s.isRunning = true`. No converse is required,
  because reduced-motion presentation may keep a running state static.
- **Candidate Lean:** **NEEDS-CARRIER** `animated : Ornament → Bool` and
  `statusOrnament`; target implication above. Fuel laws L46-L47 explain the
  moving frontier but do not prove a UI theorem.
- **Falsifier:** an animated `.done _` or `.refused _` ornament.

### ORN-40 — completed ledger rows are stable under suffix growth

- **Source:** §4.2, G10, second sentence.
- **Area:** A LEDGER. **Kind:** GRAMMAR. **Obligation class:** preservation.
- **Formal claim:** For all `w v : Word` and every position `i < w.length`, the
  first-order row descriptor at `i` in `ledger (w ++ v)` equals the row
  descriptor at `i` in `ledger w`.
- **Candidate Lean:** **NEEDS-CARRIER** `rowAt : Ornament → Nat → Option Row`
  and a first-order `Row`; derive from ORN-31, not from DOM identity.
- **Falsifier:** append one binding and observe any earlier row descriptor
  change.

---

## Claims from §4.3 — precedence

### ORN-41 — ornament layers are monotonically ordered

- **Source:** §4.3, precedence chain.
- **Area:** C BLOOM+GRAMMAR. **Kind:** GRAMMAR. **Obligation class:** invariant.
- **Formal claim:** Along every root-to-leaf path in an admitted layered
  ornament, layer ranks occur in the declared order
  `foundation < datum < joint < cadence < sign < bloom < lightMotion`; no
  later constructor contains an earlier layer as a qualification above itself.
- **Candidate Lean:** **NEEDS-CARRIER** `OrnamentLayer.rank`, a layered wrapper,
  and `Layered.WF`; target is sortedness of every path's rank list.
- **Falsifier:** a foundation node placed above a sign or a datum introduced
  after bloom on one path.

### ORN-42 — qualification never hides prior semantic references

- **Source:** §4.3, “may qualify, may not obscure”.
- **Area:** C BLOOM+GRAMMAR. **Kind:** GRAMMAR. **Obligation class:**
  preservation.
- **Formal claim:** For every well-formed base ornament `x` and every valid
  higher-layer qualifier `q`,
  `semanticRefs x ⊆ visibleRefs (qualify q x)`.
- **Candidate Lean:** **NEEDS-CARRIER** `qualify` and `visibleRefs`; exact set
  representation remains a modeling choice.
- **Falsifier:** applying any sign, bloom, light field, or motion qualifier
  removes the only visible sort, address, or clause of the base.

### ORN-43 — a refusal sign may break cadence but preserves sort

- **Source:** §4.3, sign rule.
- **Area:** C BLOOM+GRAMMAR. **Kind:** GRAMMAR. **Obligation class:**
  preservation.
- **Formal claim:** For every binding-scale ornament `x` with visible sort
  `t`, qualifying `x` by a refusal sign may change cadence continuity but must
  leave `t` in `visibleRefs` and must add exactly one refusal clause.
- **Candidate Lean:** **NEEDS-CARRIER** `qualify`, cadence observation,
  `visibleRefs`, and clause observation.
- **Falsifier:** a refusal sign that replaces the row so completely that its
  sort cannot be recovered.

### ORN-44 — bloom preserves the root address

- **Source:** §4.3, bloom rule.
- **Area:** C BLOOM+GRAMMAR. **Kind:** GRAMMAR. **Obligation class:** identity
  preservation.
- **Formal claim:** For every addressed root ornament `x` and bloom qualifier
  `b`, `addresses (qualify b x) = addresses x`; in particular the bloom cannot
  cover, shorten, replace, or mint the address.
- **Candidate Lean:** **NEEDS-CARRIER** address observation and bloom
  qualification.
- **Falsifier:** adding bloom replaces a full address with a motif identifier.

### ORN-45 — motion preserves word observation

- **Source:** §4.3, motion rule.
- **Area:** A LEDGER. **Kind:** GRAMMAR. **Obligation class:** trace
  preservation.
- **Formal claim:** For every word-derived ornament `x` and every motion state
  `m`, the ordered binding observation before and after applying `m` is equal.
- **Candidate Lean:** **NEEDS-CARRIER** a first-order motion annotation and
  `primaryBindings`; target
  `primaryBindings (withMotion m x) = primaryBindings x`.
- **Falsifier:** a moving frontier reorders or temporarily removes bindings.

---

## Claims from §5 — sort-to-shape consequences

### ORN-46 — outer terminal constructors elaborate with no refs

- **Source:** §5, outer-grammar terminal row.
- **Area:** B SCREEN. **Kind:** DERIVED. **Obligation class:** invariant.
- **Formal claim:** For every `H` and valid payloads `p`, the `refs` field of
  `Tree.node H (.value p)`, `.chunk p`, `.schema p`, and `.git p` is `[]`.
- **Candidate Lean:** four `rfl` theorems, or one theorem by cases restricted
  to these constructors. Do not generalize to every value of those result
  sorts without checking that `.tree` has both leaf and parent constructors.
- **Falsifier:** any listed constructor elaborating to a nonempty `refs` list.

### ORN-47 — unary wrappers flatten child then self

- **Source:** §5, one-child wrapper row.
- **Area:** A LEDGER. **Kind:** DERIVED. **Obligation class:** ordering.
- **Formal claim:** For every `H`: (i) a `.leaf i l d` flattens as
  `d.flatten H ++ [self]`; (ii) `.manifest ... root` as
  `root.flatten H ++ [self]`; and (iii) `.file ... c` as
  `c.flatten H ++ [self]`.
- **Candidate Lean:** the three constructor equations of `Tree.flatten`, each
  expected by `rfl` after unfolding.
- **Falsifier:** a unary wrapper with self before child or more than one child
  segment.

### ORN-48 — parent flattening preserves left then right then self

- **Source:** §5, ordered binary joint row.
- **Area:** A LEDGER. **Kind:** DERIVED. **Obligation class:** ordering.
- **Formal claim:** For every `H` and `l r : Tree .tree`,
  `Tree.flatten H (.parent l r) =
  l.flatten H ++ r.flatten H ++ [self]`.
- **Candidate Lean:** constructor equation of `Tree.flatten`, expected `rfl`.
- **Falsifier:** right before left, or self between the two child words.

### ORN-49 — entry flattening preserves item then previous then self

- **Source:** §5, historical joint row.
- **Area:** A LEDGER. **Kind:** DERIVED. **Obligation class:** ordering.
- **Formal claim:** For every `H`, note, item, and previous entry,
  `flatten (.entry note item prev) =
  item.flatten H ++ prev.flatten H ++ [self]`.
- **Candidate Lean:** constructor equation of `Tree.flatten`, expected `rfl`.
- **Falsifier:** previous entry before item, or the new entry binding before
  either dependency.

### ORN-50 — genesis flattening is a singleton

- **Source:** §5, genesis row.
- **Area:** A LEDGER. **Kind:** DERIVED. **Obligation class:** domain.
- **Formal claim:** For every `H`, `Tree.flatten H .genesis` is exactly the
  singleton containing the genesis binding.
- **Candidate Lean:** constructor equation of `Tree.flatten`, expected `rfl`.
- **Falsifier:** genesis with zero bindings or a dependency binding.

### ORN-51 — program continuation refs and word preserve line order

- **Source:** §5, program cadence row.
- **Area:** A LEDGER. **Kind:** DERIVED. **Obligation class:** adequacy/order.
- **Formal claim:** For every `H` and `p : PProg`: (i)
  `(tableNode H p).refs = p.map (fun l => ⟨stepWireTag, lineAddr H l⟩)`;
  and (ii) `encodeProg H p` is the mapped step bindings in program order
  followed by exactly one continuation binding for `tableNode H p`.
- **Candidate Lean:** both are the defining equations of `tableNode` and
  `encodeProg`; the prover may name them for the renderer rather than rely on
  unfolding across module boundaries.
- **Falsifier:** a continuation with permuted step refs or a table binding
  before its steps.

### ORN-52 — guarded schema recursion is acyclic at bare edges

- **Source:** §5, schema recursion row.
- **Area:** C BLOOM+GRAMMAR. **Kind:** DERIVED. **Obligation class:** invariant.
- **Formal claim:** For every document `d`, `d.Guarded` holds exactly when no
  table name reaches itself by one or more `Document.Edge` steps, where
  `.susp` contributes no bare successor.
- **Candidate Lean:** `Document.Guarded` is definitionally `¬ d.Cyclic`;
  `bareRefs_susp` supplies the suspension equation. This is a definitional
  characterization, distinct from checker adequacy ORN-14.
- **Falsifier:** a bare self-cycle satisfying `d.Guarded`, or a path under
  `.susp` appearing in `Ast.bareRefs`.

### ORN-53 — `Tree .context` is empty in the current grammar

- **Source:** §5, sort without a current `Tree` constructor row.
- **Area:** B SCREEN. **Kind:** DERIVED. **Obligation class:** domain/negative.
- **Formal claim:** There is no value of type `Cas.Grammar.Tree .context`.
- **Candidate Lean:** `theorem tree_context_empty
  (tr : Tree .context) : False := by cases tr` or an `IsEmpty` instance if the
  owning module wants one. Do not infer that the `.context` sort itself is
  absent: it remains a constructor of `Ty`.
- **Falsifier:** any current `Tree` constructor whose result index is
  `.context`.

### ORN-54 — outer schema refs and inner schema recursion are separate planes

- **Source:** §5, paragraph after the table.
- **Area:** B SCREEN. **Kind:** DERIVED. **Obligation class:** claim-scope.
- **Formal claim:** For every `H` and schema payload `p`,
  `(Tree.node H (.schema p)).refs = []`; independently, values of
  `Cas.Schema.Ast` may contain `.reference` and `.susp`, and document
  guardedness is computed from that inner syntax. No theorem transports one
  plane's refs into the other in grammar v0.
- **Candidate Lean:** the outer equation is `rfl`; inner inhabitation has
  witnesses `.reference "A"` and `.susp (.reference "A")`. The final sentence
  is a claim-scope boundary, not a universal negative theorem.
- **Falsifier:** an outer `Tree.schema` node with store refs, or a proof that
  `Ast.reference` is impossible.

---

## Refused taste claims from §7

Each line is intentionally a refused theorem target. A prover should not
replace it with an arbitrary axiom or derive it from a richer observation than
the store semantics supplies.

| id | source | area | kind | obligation class | formally refused claim | falsifier shape |
|---|---|---|---|---|---|---|
| ORN-55 | §7.1 family names | C BLOOM+GRAMMAR | TASTE | claim-scope | **REFUSED:** no estate theorem uniquely selects the names “Prairie Ledger”, “Light Screen”, or “Taliesin Bloom”. | Rename all three while preserving every structural observation. |
| ORN-56 | §7.2 exact geometry | A LEDGER | TASTE | underdetermination | **REFUSED:** no function of `Word`, `Tree`, or `Document` uniquely determines radius, stroke width, cap shape, branch angle, or petal count. | Two geometries with identical binding/sort/address observations. |
| ORN-57 | §7.3 typeface | A LEDGER | TASTE | underdetermination | **REFUSED:** no estate carrier uniquely selects a font family or modular scale. | Two typefaces rendering the same canonical text and layout facts. |
| ORN-58 | §7.4 verdict hue | C BLOOM+GRAMMAR | TASTE | underdetermination | **REFUSED:** the spending rule does not uniquely determine an OkLCH hue. | Two accessible hues assigned to the same standing partition. |
| ORN-59 | §7.5 spacing | A LEDGER | TASTE | quantitative boundary | **REFUSED:** algebraic row uniformity does not determine pixel height, gutter width, or spacing constants. | Two constant layouts with different measurements. |
| ORN-60 | §7.6 collection choice | B SCREEN | TASTE | product scope | **REFUSED:** the store algebra does not select which collection deserves a view or a whole screen. | Two users choose different collections over the same trunk. |
| ORN-61 | §7.7 cache policy | B SCREEN | TASTE | operational policy | **REFUSED:** “view is a cached register” does not determine which state is stored and which derivation is recomputed. | Two cache strategies produce the same view description. |
| ORN-62 | §7.8 glyphs | B SCREEN | TASTE | underdetermination | **REFUSED:** `Ty` does not uniquely determine one glyph per sort. | Two icon sets preserve the same sort labels and typed joints. |
| ORN-63 | §7.9 future sum regrouping | B SCREEN | TASTE | claim-scope | **REFUSED:** current absence of a ruled signature isomorphism does not prove no future controlled visual equivalence can be admitted. | Define a future explicit reassociation isomorphism and keep its brackets/provenance. |
| ORN-64 | §7.10 hash certainty | C BLOOM+GRAMMAR | TASTE | assumption boundary | **REFUSED:** no ornament theorem may assume SHA-256 injective or infer node equality from address equality without the stated hypothesis. | Two distinct canonical byte strings under an abstract colliding `H`. |
| ORN-65 | §7.11 guarded completion | C BLOOM+GRAMMAR | TASTE | termination claim-scope | **REFUSED:** `Document.Guarded` alone does not imply value existence or termination when forced. | `A = susp (reference A)` after a forcing semantics is supplied. |
| ORN-66 | §7.12 performance | A LEDGER | TASTE | deployment/performance | **REFUSED:** no store law determines virtualization, batching, cache size, or frame budget for ten million entries. | Two implementations with the same model observations and different costs. |
| ORN-67 | §7.13 motion timing | C BLOOM+GRAMMAR | TASTE | accessibility/product policy | **REFUSED:** fuel expenditure does not determine easing, duration, or reduced-motion behavior. | Static reduced-motion and animated presentations of the same running status. |

---

## Dependency note

Area C must define and grill the minimal `Ornament` inductive before any
grammar theorem can close. The direct dependencies are:

1. **Core inductive + observations first:** ORN-25, ORN-26, ORN-32, ORN-34,
   and ORN-41 define or constrain `Ornament`, `leaves`, `shape`, semantic
   references, and layers.
2. **Tree projection next:** ORN-7, ORN-29, ORN-36, and ORN-37 need
   `renderTree`; ORN-1, ORN-22, ORN-31, ORN-40, and ORN-45 need `ledger` and
   `primaryBindings`.
3. **Schema projection next:** ORN-24 and ORN-35 need an explicit path-aware
   `renderDocument`; `Ast.bareRefs` alone cannot reconstruct guarded paths.
4. **Sum expression carrier next:** ORN-10, ORN-28, ORN-32, and ORN-33 need a
   named `SignatureExpr`, because the real `Sig` carrier contains operations
   and answers but no presentation names.
5. **Evidence/view records last:** ORN-8, ORN-9, ORN-12, and ORN-18 through
   ORN-23 need the small hole, view, verification, gate, and claim-reference
   records. They do not block the pure grammar core.
6. **No ornament carrier needed:** DERIVED claims ORN-2 through ORN-6,
   ORN-11, ORN-13 through ORN-15, and ORN-46 through ORN-54 can be proved or
   refuted directly against the current estate. ORN-11 should be refuted first
   because it records a known stale statement in `MATHY-DIRECTIONS.md`.

Area A and Area B may prove their `DERIVED` claims immediately, but every
claim classified `GRAMMAR` remains declaration-planning only until Area C's
carrier and observations are operator-approved. No prover should smuggle a
rendering library, CSS value, or pixel geometry into that carrier merely to
make a taste claim stateable.

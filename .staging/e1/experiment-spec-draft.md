# E1 — A verified content-addressed definition core

Status: staged material, pre-grade — 2026-08-24. Not an artifact: it carries no
artifact kind, no canonical identity, and no declared transformations. It makes
no gated claim; it *proposes* claims and names the gate each would have to
reach. Nothing here is minted vocabulary. It enters `docs/`, `formal/`, or
`experiments/` only after the operator's grilling (C4), and the promoting act
is the commit into a graded home.

Highest satisfied gate: none. This document is a proposal, not evidence.

Concurrent staged material, deliberately not read while drafting this file:
`.staging/e1/concrete-capability.md` and `.staging/e1/unison-hashing.md`.
Where this document marks a fact about Unison's algorithm or Concrete's
capability as *pending*, those two files are the expected authority; their
findings supersede the pending marks here.

---

## 0. Vocabulary discipline

E1 needs words the estate does not yet own. They are listed here as
**candidate** terms in the shape a minting requires (name, artifact kind,
carrier or judgment form, obligations, avoid-list) so the grilling has
something to attack. None is minted; none may be used in a gated claim until
it is.

One collision is already visible and must be resolved before anything is
written down twice. Source Provenance owns **Content Digest**: "an
algorithm-qualified digest of the materialized file bytes, independent of the
Git object identifier." That is a digest of *bytes as stored*. E1's object is a
digest of a *canonical form*, which is deliberately blind to byte-level
differences. Two different words are required.

| Candidate term | Carrier / judgment | Obligations | Avoid |
|---|---|---|---|
| **Term** | A project-owned inductive type: the object language whose definitions are identified. | Constructors explicit; invalid cases explicit (I-005). | AST, expression, node |
| **Declared equivalence** | A relation `≈` on Terms that the identity scheme is required to respect (e.g. alpha-equivalence). | Proved an equivalence relation; decidability stated or explicitly not claimed. | sameness, equality (bare) |
| **Canonical form** | A project-owned type `Canon`, plus a total function `canon : Term → Canon`. | `canon` respects `≈`; `canon` is representation-independent (§4, D1–D3). | normal form, normalized AST |
| **Canonical serialization** | A `codec`: `Canon → ByteArray` with a partial inverse. | Injective on `Canon` (theorem); round-trip obligations (I-003 codec soundness). | encoding, wire format |
| **Digest function** | An abstract parameter `H : ByteArray → Digest`, not a fixed algorithm. | Nothing assumed but functionality; injectivity appears only as a *hypothesis* (§3.4). | hash (bare), checksum |
| **Definition identity** | `ident := H ∘ serialize ∘ canon : Term → Digest`. | Direction A and Direction B stated separately (§3.4). | content hash, Content Digest (owned by Source Provenance), fingerprint |
| **Identity scheme** | The triple (declared equivalence, canonical form, digest function) together with its version tag. | Version is part of the identity; a scheme change is a new scheme, never a silent upgrade. | hashing algorithm, versioning |
| **Definition store** | An append-only finite map `Digest ⇀ Canon`. | Monotone, idempotent, order-independent under insertion (§3.2). | database, codebase, repository |
| **Name binding** | A separate finite relation `Name ⇀ Digest`, stored beside the store, never inside the hashed material. | Changing a name binding provably does not change any identity. | naming, alias, symbol table |

Two further notes on estate words. **Formally verified** appears in this
document only with its scope attached: the property proved, the semantic model
it is proved against, and the trusted base. Where a scope is not yet fixed, the
obligation is written as pending, not softened.

---

## 1. Object of study

### 1.1 What E1 studies

E1 studies the **minimal UCM core**: the smallest object that reproduces
Unison's central move — a definition's identity is computed from the
definition itself, and its name is metadata attached afterwards.

Unison Codebase Manager ("UCM") is the tool that maintains a Unison codebase;
"UCM core" here names the identity mechanism inside it, not the tool. Three
components, and nothing else:

1. **A canonicalization function.** Terms of the object language are mapped to
   a canonical form that erases everything the declared equivalence says is
   irrelevant. For a lambda-calculus-shaped language that means at minimum
   erasing binder names (alpha-equivalence). It may also mean normalizing the
   order of unordered structures and erasing source-level trivia.
2. **A content digest over the canonical form.** The canonical form is
   serialized to bytes by an injective serialization and digested. The digest
   is the definition's identity.
3. **An append-only store with names as metadata.** The store maps identity to
   canonical form and never removes or overwrites. Names live in a *separate*
   mapping from name to identity. Renaming rebinds a name; it does not touch a
   stored definition and cannot change any identity.

The single sentence the experiment exists to make checkable: *identity is a
function of meaning-modulo-a-declared-equivalence, and names are a projection
laid over it, not part of it.*

### 1.2 What E1 excludes

Explicitly out of scope. Each exclusion is a claim boundary, not a deferral of
enthusiasm.

- **Runtime and evaluation.** No interpreter, no reduction relation, no
  normalization-by-evaluation, no confluence or standardization theorems. E1
  never asks what a term *does*; only how it is *identified*. If evaluation
  enters, the declared equivalence stops being alpha-equivalence and becomes
  something undecidable, and the whole claim structure changes.
- **Abilities / algebraic effects.** Unison's effect system is excluded
  entirely. It is the part of Unison most entangled with typechecking and is
  irrelevant to identity at this scope.
- **Typechecking and type-directed hashing.** Unison's real scheme entangles
  term hashes with type hashes and data-declaration hashes. E1 as specified
  identifies *terms*. Whether type hashing must be included is a scope
  decision (§7, Q3) — it is forced if and only if the option chosen targets
  hash conformance.
- **Distribution, sync, and remote codebases.** No Unison Share, no push/pull,
  no transfer protocol, no garbage collection of unreachable definitions.
- **Namespace merge algebra.** Names-as-metadata is in scope at the level of
  "a name mapping exists beside the store and does not affect identity".
  Unison's namespace/branch merge, patches, and update propagation are out.
- **Full Unison syntax.** No Unison parser, no pretty-printer, no
  round-tripping to Unison source. Where an option needs Unison terms, it
  consumes them as an AST or via a pinned tool, never by reimplementing the
  surface language.
- **Cryptographic security results.** Collision resistance of the digest
  function is an assumption with a name, never a theorem of this experiment
  (§3.4). E1 proves nothing about any hash primitive's security.
- **Storage engineering.** No SQLite codebase format, no indices, no
  concurrency, no crash safety. The store is a finite map in the model and a
  boring append-only file or map in any implementation.

---

## 2. Three scoping options

All three share the same theorem spine (§3.1–§3.3) and the same trust
statement (§3.4). They differ in the object language and in whether an external
authority is admitted into the loop.

**Effort classes**, defined here so the word means something:

| Class | Meaning |
|---|---|
| **E-S** | One Lake project, roughly ten or fewer theorem statements, no new trusted seam, no foreign artifact in the loop. |
| **E-M** | Roughly ten to thirty theorem statements; one genuinely new piece of machinery (binder canonicalization plus an injective serialization qualifies); still no foreign artifact in the loop. |
| **E-L** | E-M plus a conformance lane against a foreign artifact, or a new trusted seam (FFI, external binary). Adds pins, receipts, drift detection, and a harness that must itself be maintained. |
| **E-XL** | E-L plus a formalized foreign algorithm (a G3 extraction), or a per-language plugin family each carrying its own obligations. |

### O1 — Own term language, own scheme (smallest)

**What gets implemented.** A project-owned term type of
untyped-lambda-calculus size: variables, lambda, application, `let`, literals,
and — subject to Q1 — a recursive binding group. A canonicalizer to a de
Bruijn-indexed (nameless) canonical form. An injective canonical serialization
to bytes. A digest function held as an abstract parameter with one concrete
instantiation behind a named seam. An append-only definition store and a
separate name-binding map. No parser is required: terms may be constructed
directly, or read from a trivial S-expression reader that is explicitly outside
the proof boundary.

**What gets proved.** The full spine at G1: the determinism family D1–D3 (§4),
alpha soundness, serialization injectivity on canonical forms, the store laws
(monotone, idempotent, order-independent), and name-independence of identity.
Direction A of definition identity unconditionally; Direction B as a theorem
conditional on a stated injectivity hypothesis. No G2 traceability to any
foreign contract, because there is no foreign contract — the specification is
the lab's own.

**Effort class.** E-M.

**What it teaches.** Whether the *theorem statements* are the right ones. This
is the pass that discovers, before any conformance money is spent, that
"determinism of canonicalization" is nearly vacuous in a total-function model
(§4) and that the load-bearing statement is representation independence. It
also produces the estate's first end-to-end artifact-grade slice: a Lean model
with an axiom report, a TypeScript module derived against it, a codec with
round-trip obligations, and a canonical identity that is computed rather than
asserted. Its weakness is equally instructive: with no foreign authority, the
G4 lane degenerates into a Lean↔TypeScript differential, which tests the
*implementation*, not the *design*.

### O2 — A subset of Unison's term AST, targeting hash conformance

**What gets implemented.** Everything in O1, but with the term type replaced by
a faithful subset of Unison's own term representation and the canonicalization
and serialization replaced by Unison's versioned hashing scheme as
reconstructed from its published behavior and source. Plus the piece that makes
this option what it is: a **reproducible differential harness** that drives a
pinned Unison binary, extracts the hash it assigns to a definition, computes
the lab's hash for the same definition, and records agreement or disagreement
with the seed, corpus digest, binary digest, and hashing-scheme version.

**What gets proved.** The same G1 spine as O1, now stated about the
reconstructed scheme. Newly available and newly obligatory: **G2** requirement
traceability, mapping each modeled rule to the clause of Unison's hashing
contract it implements, with examples, counterexamples, reviewed quantifiers,
and declared observables. And **G4** as the actual payload: sampled
differential agreement against the pinned binary. What is *not* proved, and
cannot be at this option's price, is byte-identity to Unison — §4 explains
why.

**Effort class.** E-L. The cost is dominated not by the theorems but by the
conformance apparatus: pinning a binary and its hashing-scheme version,
scripting a reliable way to extract hashes, generating a corpus that actually
exercises the hard cases (recursive groups above all), and maintaining the
whole thing against upstream drift.

**What it teaches.** The real price of conformance to a foreign,
implementation-defined algorithm — the central question for any later interop
tooling, and the one O1 cannot answer. It forces the estate's G2 and G4
machinery into existence for the first time: a differential harness, a
conformance receipt format, sampled-evidence discipline that refuses promotion,
and pin-drift detection. It also produces the sharpest possible demonstration
of the claim ladder, because it is the case where a green differential result
is emphatically *not* a theorem, and the estate's vocabulary has to hold that
line under the temptation of a clean pass rate.

### O3 — A language-agnostic layer over tree-sitter ASTs

**What gets implemented.** A generic node family — node kind, named fields,
ordered children, leaf bytes — as the object language, standing in for the
concrete syntax tree any tree-sitter grammar produces. A **normalization
profile** per language: which node kinds are trivia and get dropped, which
fields are order-insensitive, which nodes are binders and how their names
normalize. A canonical serialization and digest over the normalized tree. The
same store and name layer. The parser is *outside* the boundary: tree-sitter
enters as a named trusted seam (TOOLS.md already carries `lean4-tree-sitter` as
pending admission, "C FFI — named trusted seam required"), and every claim is
about the AST-to-identity function, never about parsing.

**What gets proved.** The spine, but *parameterized over the profile*:
canonicalization respects the equivalence the profile declares; serialization
is injective on canonical forms for any profile satisfying stated
well-formedness conditions; profile composition and refinement laws (a coarser
profile's identity is a function of a finer profile's identity). Per-language
binder normalization becomes a plugin, each instance carrying its own
obligations — that is where the effort escapes.

**Effort class.** E-L to E-XL, depending on how many profiles are instantiated
and whether binder normalization is attempted for even one real language.

**What it teaches.** Whether the interop thesis (§5) survives contact. It is
the only option that tests the generalization claim directly. It also surfaces
the design ruling that matters most for everything downstream: once a parser is
in the trusted base, "identity of the artifact" silently becomes "identity of
what this parser said the artifact was", and the honest claim boundary has to
be drawn at the AST, with the source bytes carried alongside by their Content
Digest (§5.2). Discovering that with one grammar is cheap; discovering it after
building tooling for six is not.

**A sequencing observation, not a ruling.** O1's spine is a strict prefix of
O2's and O3's, and the O2 conformance lane bolts onto an O1 spine rather than
replacing it. A staged reading — O1 to fix the statements, then O2's lane as a
separate gated addition — is available and costs little beyond doing O2
directly. The choice is the operator's; §7 lists what it blocks.

---

## 3. Claim structure

Gate vocabulary from [CLAIM-GATES.md](../../docs/effect-typescript-semantics/CLAIM-GATES.md).
Soundness words are linked to their judgment per I-003.

### 3.1 G0 — source identity (prerequisite, not a result)

Nothing in §3.2–§3.3 may cite an external artifact until it is in the Source
Lock. E1 needs entries that do not yet exist (§8). Both study clones present
today are **Pending Sources** in the provenance context's sense: their exact
identities are known locally but have not been accepted into the Source Lock.

### 3.2 G1 — model theorems

Kernel-checked statements about the lab's own Lean definitions, with pinned
toolchain, declared imports, and an axiom report. These are the experiment's
actual product.

| # | Statement | I-003 obligation form |
|---|---|---|
| T1 | `canon` is representation-independent: it takes no environment, name supply, or store parameter, and its result depends only on the term. | operation preservation |
| T2 | `canon` is idempotent on canonical forms: re-canonicalizing an already-canonical form is the identity. | operation preservation |
| T3 | **Alpha soundness.** `t₁ ≈α t₂ → canon t₁ = canon t₂`. Alpha-equivalent inputs yield equal canonical forms. | construction soundness w.r.t. the declared equivalence |
| T4 | **Alpha completeness** (the converse, separately stated and separately proved): `canon t₁ = canon t₂ → t₁ ≈α t₂`. | refinement of the equivalence |
| T5 | **Serialization injectivity on canonical forms.** `serialize c₁ = serialize c₂ → c₁ = c₂`. | codec soundness |
| T6 | Round-trip: `deserialize (serialize c) = some c`, and deserialization rejects every byte string not in the image. | codec soundness |
| T7 | Store monotonicity: insertion never removes or alters an existing binding. | operation preservation |
| T8 | Store idempotence: inserting the same definition twice equals inserting it once. | operation preservation |
| T9 | Store order-independence: insertion order does not affect the resulting store. Together with T8 this makes the store a join-semilattice — the universal property worth surfacing, because every convenience operation derived from it inherits correctness. | operation preservation |
| T10 | Name independence: for any name binding change, every identity in the store is unchanged and the identity-to-definition map is unchanged. | operation preservation |
| T11 | Direction A of identity (unconditional, no cryptographic assumption): `t₁ ≈ t₂ → ident t₁ = ident t₂`. | construction soundness |
| T12 | Direction B of identity (conditional): `Function.Injective H → ident t₁ = ident t₂ → t₁ ≈ t₂`. The hypothesis is a *premise of the theorem*, never an `axiom` — the axiom report stays clean. | refinement, conditional |
| T13 | If recursive binding groups are in scope (Q1): the canonical ordering of a recursive group is independent of the order the group's members were presented in. | operation preservation |

Two invariants on how these are proved, pre-registered so they are not
negotiated later under deadline. First, **no `native_decide`** anywhere in a
kernel-checked E1 claim; it places the Lean compiler in the trusted base, which
I-002 forbids inside a kernel-checked claim. Second, the axiom report is part
of every theorem artifact, not an afterthought.

Note what is *absent* from this table: "canonicalization is deterministic" as a
standalone theorem. §4 explains why it is not a statement in a total-function
model and what replaces it.

### 3.3 G2 — specification traceability

Available only under O2 (and partially O3). The claim is "the model implements
this cited contract" and the evidence is requirement traceability: each modeled
rule mapped to the clause it implements, with examples, counterexamples,
reviewed quantifiers, and declared observables.

Under O1 there is no foreign contract, so G2 is unavailable by construction —
and saying so plainly is part of the option's honesty. Under O2 the cited
contract is Unison's hashing scheme at a pinned version. A caution that belongs
in the spec rather than in a later post-mortem: if the contract turns out to be
*only* the source code, then G2 collapses into G3 (extraction) and the option's
cost estimate moves.

### 3.4 G4 — the conformance lane

A pinned Unison binary is admitted as an **oracle**, never as a specification.
The harness is reproducible: pinned binary identity and platform, pinned
hashing-scheme version, pinned corpus, recorded generator seed and version, and
a receipt recording agreement counts and every disagreement in full.

The standing rule, stated before any number is produced: **sampled agreement is
sampled evidence.** A hundred percent pass rate over any corpus is a G4
observation. It does not promote T3, T5, or anything else. Passing a later test
never silently promotes an earlier proof.

G5 (compilation preservation) and G6 (hosted execution) are not in scope for
E1 and no claim at those gates is made.

### 3.5 The trust statement

Everything E1 relies on and does not prove, named:

- **Collision resistance of the digest function is an assumption.** It enters
  as the hypothesis of T12 and nowhere else. Structuring it this way has a
  concrete payoff: the entire soundness direction (T11) needs no cryptographic
  assumption at all, because it is pure congruence. Only the converse — "equal
  identity implies equal meaning", the direction a codebase manager actually
  relies on when it deduplicates — carries the assumption, and it carries it
  visibly.
- **The digest primitive's implementation is a named seam.** The model
  parameterizes on `H`; any concrete instantiation (a Lean-modeled SHA-2, a
  native primitive behind FFI, a JavaScript implementation) is a separate
  component with its own gate and its own trust cost. Note the standing
  opportunity here: Concrete's `hmac_sha256` example is a bounded SHA-256 with
  a Lean refinement proof against an independent specification, precisely
  because SHA-256's compression rounds forced `u32` wrapping arithmetic, bit
  operations, and shifts into `ProvableV1`. That makes the *primitive* the one
  part of the UCM core that Concrete can carry evidence for today. See §7, R2,
  for what was actually observed in the pinned clone before relying on this.
- **The Unison binary is trusted as an oracle only.** Its agreement is
  evidence about the lab's implementation, never evidence about the lab's
  theorems, and never a definition of correctness that a theorem could quote.
- **Tree-sitter, if O3 is chosen, is a trusted C FFI seam** and must be
  registered in TOOLS.md before its output enters gated work. The claim
  boundary is drawn at the AST.
- **Parsing and pretty-printing are outside the boundary** in all three
  options.
- **LLM harnesses** carry their standing empty trust contribution: every output
  passes a machine-checked gate, and the gate carries the trust.
- **bun and node** contribute sampled evidence only (G4 at best), per the
  existing register.

---

## 4. What "deterministically identical output" can mean

The phrase is used loosely in content-addressing discussions and it hides at
least four distinct statements with wildly different prices. This section
separates them, because getting this wrong is the single most likely way for
E1 to produce a confident claim that means less than it sounds like.

### 4.1 (a) Determinism theorems about our own implementation

**The trap first.** In a Lean model, `canon : Term → Canon` is a total
function. Functions are deterministic by construction: `t = t → canon t = canon
t` is trivially true and proves nothing. A theorem named
`canon_deterministic` would be an artifact of the theorem prover, not a fact
about canonicalization. The estate should refuse to ship it, and the refusal is
worth writing down because such a theorem would *look* exactly like the
headline result.

What the phrase actually decomposes into, once the trap is avoided:

- **D1 — Representation independence.** `canon`'s result depends on the term
  and nothing else: no name supply, no counter, no store, no traversal-order
  parameter, no ambient environment. If the definition takes such a parameter
  for convenience, D1 is the theorem `∀ e₁ e₂, canon e₁ t = canon e₂ t`. If it
  takes none, D1 is discharged by the *shape of the definition* and should be
  recorded as a structural property with its justification, not dressed up as a
  theorem. This is T1.
- **D2 — Quotient respect (the real content).** `t₁ ≈ t₂ → canon t₁ = canon
  t₂`. This is where "identical inputs give identical outputs" becomes
  non-trivial, because "identical" now means *identical modulo the declared
  equivalence*, and the equivalence is a choice the lab makes and must defend.
  For alpha-equivalence this is T3, and its converse T4 is what makes the
  canonical form a genuine quotient representative rather than merely a
  collapsing map. A canonicalizer that sends every term to a single constant
  satisfies D2 and fails T4 — which is exactly why the two are separate rows.
- **D3 — Idempotence and stability.** `canon` is a fixed point on its own
  image (T2), and inserting into the store does not perturb it (T1 again, in
  its store-free form). Without D3, "canonical" is a name rather than a
  property.
- **D4 — Implementation determinism.** The TypeScript implementation is a pure
  function of its input: no clock, no randomness, no dependence on `Map`
  iteration order, no locale-sensitive string comparison, no floating-point
  path, no host-dependent byte ordering. **D4 is not a G1 theorem.** It is a
  property of a program running on a host, and the model cannot see it. It is
  established, to the degree it can be established at all, by the G4
  differential lane and by the I-002 discipline that keeps ambient clocks,
  randomness, and schedulers out of the core. Conflating D4 with D1 is the
  specific error this section exists to prevent: D1 is proved and cheap, D4 is
  observed and expensive, and they sound identical in a sentence.

### 4.2 (b) Byte-identical conformance to Unison's implementation

The statement "our hash of this definition equals the hash Unison assigns it"
is **observational** — a G4 claim — and stays observational.

The reason is not squeamishness; it is that a theorem needs both sides to be
mathematical objects, and Unison's side is a program. The hash Unison assigns
is defined, operationally, by what a particular build of a particular Haskell
package computes on a particular input. To make it a theorem's right-hand side,
one of these must exist:

1. **A formal model of Unison's algorithm, written by the lab.** Then the
   provable statement is "our canonical form equals *our Lean model of Unison's
   hashing scheme*". That is a real theorem, and it is not the claim people
   will hear. The gap between the lab's model-of-Unison and Unison's actual
   binary is exactly the gap the theorem does not close, and it can only be
   narrowed by G2 traceability (does the model match the documented contract?)
   and G4 differential (does the binary agree with the model on samples?).
   Neither is a proof of the composite claim.
2. **A G3 extraction.** Admit a pinned fragment of Unison's own source as
   evidence, define a translation from that fragment into the model, and prove
   preservation. This is the only route to a theorem that genuinely mentions
   Unison rather than the lab's paraphrase of it — and even then the claim is
   about the *pinned source*, not about any compiled binary a user runs, which
   would additionally require G5 and G6 for the Haskell toolchain. Unison's
   compiled artifact is not derived from a verified pipeline, so byte-identity
   to the shipped binary remains observational no matter how much is proved
   above it.

**Unless Unison's algorithm is itself formalized.** It is not, as far as this
document can assert without a pin; the sibling deliverable
`.staging/e1/unison-hashing.md` is the authority on what published
specification material exists. Marked pending (C6).

### 4.3 What formalizing it would take — estimate

Scoped estimate for route (2) above, the honest one. Four components, none
optional:

- **A semantics for the source fragment.** Unison's hashing lives in Haskell.
  A G3 extraction needs either a formal semantics for the Haskell fragment used
  (laziness, `Data.Map` ordering, strictness of the folds, and the `ABT`
  abstract-binding-tree machinery the scheme is built on) or a hand-translation
  into Lean with a *reviewed, recorded* correspondence protocol and an explicit
  trust statement covering the translation step. There is no cheap version of
  this: the first is a research project, the second is a trusted seam wearing a
  theorem's clothes, and the choice must be declared rather than blurred.
- **The hashing scheme's full surface.** Term tokenization, de Bruijn handling,
  the treatment of mutually recursive definition groups as components with a
  canonical intra-component order, type and data-declaration hashing (which
  term hashing depends on), and the digest encoding. The recursive-group
  handling is the part that is genuinely hard and the part a small prototype
  will silently omit.
- **The digest primitive, bit-exactly, in Lean.** Not "a hash function" but the
  specific one Unison uses, modeled to the bit, with its own correctness
  argument against the relevant standard. This is a substantial verification
  effort on its own — comparable in size to the entire O1 option — and it is
  pure prerequisite: it produces none of E1's interesting results.
- **A drift regime.** Unison versions its hashing deliberately. Any formalized
  result is a result about one scheme version and expires when upstream moves.

Effort class for the whole of route (2): **E-XL**, and it produces a claim
whose headline ("our hashes match Unison's") is *already available at G4 for a
small fraction of the cost*, with the difference being a strength of belief the
experiment may not need. That asymmetry is the finding this section is really
for, and it is an argument the operator should have in hand before O2 is
scoped.

---

## 5. The interop thesis

### 5.1 The generalization

The UCM core is not really about Unison. Stripped to its structure it is:

> Fix an equivalence on syntax trees. Canonicalize into it. Serialize
> injectively. Digest. The result is an identity that is stable under
> everything the equivalence declares irrelevant, and distinguishing under
> everything else.

Nothing in that sentence mentions a language. Instantiate the tree family with
the concrete syntax trees tree-sitter produces for arbitrary languages, and
each language contributes only a **normalization profile**: which nodes are
trivia, which fields are unordered, which nodes bind names. The core — the
serialization, the digest, the store, the name layer, and every theorem in
§3.2 — is shared, parameterized, and proved once.

That is the projection pattern the charter already commits to, applied to
identity: one description (the profile), a derived artifact per language, and
one theorem transported to all of them. Which is also the honest test of P3 at
small scale — if the identity core cannot be parameterized without the theorems
degenerating, the interop thesis is weaker than it sounds, and E1 finds that
out for the price of one experiment rather than one platform.

The payoff, if it holds, is a canonical identity that survives reformatting,
comment edits, whitespace churn, and — where binder normalization is
implemented — renaming. That is an identity a build cache, a proof-drift
detector, a review tool, or an agent's memory can key on, where a byte digest
would produce a false miss on every cosmetic change.

### 5.2 Relation to SWHID-style identifiers

Software Heritage persistent identifiers (SWHIDs) identify *bytes and trees*:
content, directory, revision, release, snapshot — computed with Git-compatible
object hashing. Details of the current SWHID specification version are marked
pending; no pin exists.

The relationship is layered, not competitive, and stating it precisely is
useful for its own sake:

| Layer | Identifies | Invariant under | The lab's word |
|---|---|---|---|
| SWHID / Git object | The exact bytes of a file or tree | Nothing (any byte change is a new identity) | **Content Digest** (Source Provenance owns it) |
| E1's identity scheme | A canonical form of a parsed tree | Whatever the declared equivalence says: formatting, trivia, and where implemented, binder names | **Definition identity** (candidate, §0) |
| Behavioral equivalence | What a program *does* | Any semantics-preserving rewrite | Out of scope; undecidable in general |

The middle layer is the useful one precisely because it is a *choice*. It is
coarser than bytes and finer than behavior, and the whole design question is
where in that interval to sit — which is exactly what "declared equivalence"
names. Two artifacts with the same SWHID necessarily share a definition
identity; the converse fails, and that failure is the entire value.

The two layers compose into the record the charter's central bus is made of: a
link from **the SWHID of the source bytes we parsed**, through **the profile
and scheme version we canonicalized under**, to **the definition identity we
computed**. That triple is reproducible, auditable, and exactly the "recorded
link between an artifact and its evidence" the roadmap describes. It also keeps
the trusted parser honest: the source bytes are pinned by Content Digest even
though the claim is about the AST, so a parser change is detectable rather than
invisible.

### 5.3 Why this is the central bus's first primitive

The charter defines artifact grade as three things: an artifact kind, **a
canonical content-addressable identity**, and declared transformations. The
first is a ledger entry. The third is a procedure. The second is currently a
promise — asserted vocabulary with no implementation, no theorem, and no
executable meaning. Every artifact the estate produces claims a canonical
identity it cannot yet compute.

E1 builds that. Three further reasons it is *first* rather than merely
important:

1. **P2 names it.** Reflective closure requires every admitted layer to be
   "representable, exchangeable, canonicalizable, and governable one layer up".
   Canonicalization is the operative verb, and it currently has no referent.
2. **The central bus is defined as canonical forms plus machine-checked proofs
   plus recorded links.** E1 delivers the first in machine form and the third
   in a checkable format, using the second as its method. It is the only
   roadmap-adjacent item that touches all three.
3. **It is upstream of the repo self-model.** Roadmap item 2 type-models the
   estate itself: grades, kinds, contexts, transformations. Those types will
   need an identity for the things they classify. Building the self-model on an
   unimplemented notion of canonical identity means either stubbing it or
   discovering the requirements late.

And a fourth reason specific to the Concrete study, which is where the interop
thesis stops being abstract. Concrete already computes something structurally
identical to a canonical form: a **body fingerprint**, an S-expression
rendering of the extracted proof-core body, used to detect drift between a
source function and the theorem attached to it. Observed directly in the pinned
clone, the fingerprint for one function reads:

```text
hmac_sha256.ch: "[(ret (binop Concrete.BinOp.bitxor
  (binop Concrete.BinOp.bitand (var x) (var y))
  (binop Concrete.BinOp.bitand
    (binop Concrete.BinOp.bitxor (var x) (int 4294967295)) (var z))))]"
```

Two observations follow, and both are load-bearing for E1's relevance. First,
this is a canonical form serialized as text and compared as text — it is the
UCM core with the digest step omitted, and Concrete's own roadmap item R-0004
is described as owning a versioned `ProofSubjectDigest`, which is that missing
step plus a scheme version. Second, and more interesting: the form embeds
binder names (`(var x)`, `(var y)`). Its declared equivalence is therefore
*finer* than alpha-equivalence, and renaming a parameter changes the
fingerprint and invalidates an attached proof that remains perfectly valid. An
identity scheme with a declared equivalence and an alpha-soundness theorem is
precisely the object that fixes it. That is a specific, checkable, upstream
contribution — evidence that the interop thesis has a customer, not just a
motivation.

---

## 6. Candidate artifact inventory and Lake layout

### 6.1 Candidate artifacts, with kinds from KINDS.md

Candidates only. Each earns artifact grade the ordinary way, and the promoting
act is the commit into a graded home.

| Candidate | Kind | Home | Note |
|---|---|---|---|
| Content-identity context glossary | `glossary` | `docs/content-identity/CONTEXT.md` | Mints §0's terms; requires a CONTEXT-MAP.md entry and a relationship to Source Provenance (the Content Digest boundary). |
| Identity-kinds taxonomy | `taxonomy` | `docs/content-identity/` | The §5.2 layering — byte identity, canonical identity, behavioral equivalence — with stated axes. Feeds roadmap item 1 directly. |
| Scoping decision O1/O2/O3 | `adr` | `docs/content-identity/` | Context, choice, consequences. Written after the grilling, recording what was ruled. |
| Term language and canonical form | `model` | `formal/content-identity/` | Carriers, constructors, well-formedness, the declared equivalence. |
| T1–T13 | `theorem` | `formal/content-identity/` | One artifact per statement, each with proof and axiom report. |
| Canonical serialization | `codec` | `formal/content-identity/` + `experiments/` | Paired encode/decode with round-trip obligations (T5, T6). The smallest instance of the estate's projection pattern. |
| Canonical-form wire description | `schema` | `experiments/` | Effect Schema: type and encoded views with laws; the TypeScript side of the codec. |
| Identity core implementation | `module` | `experiments/content-identity/` | TypeScript/Effect: canonicalize, serialize, digest, store, name layer. Declared interface; derived against the model, not written against prose. |
| Differential harness | `tool` | `experiments/content-identity/` | O2 only. Drives the pinned oracle, emits conformance receipts. |
| Identity CLI | `tool` | `experiments/content-identity/` | Optional. Compute an identity for a file or AST; the dogfooding surface. |
| Conformance receipts | *not an artifact* | `.reference/` or an experiment output | Evidence. Selected, not built. |

The digest primitive is deliberately absent from this table. Under the §3.5
structure it is a parameter, and any concrete instantiation is a separately
gated component whose home depends on the ruling in Q4.

### 6.2 Lake layout

AGENTS.md governs: one Lake project per formal effort, no Mathlib by default,
`formal/lib/` only when two projects share code. `formal/` is currently empty,
so E1 would create the estate's first Lean project.

**One project: `formal/content-identity/`.** E1 is one formal effort. Proposed
modules — `Term.lean` (carriers, constructors, well-formedness),
`Equivalence.lean` (the declared equivalence and its properties),
`Canonical.lean` (`canon`, T1–T4, T13), `Serialize.lean` (the codec, T5–T6),
`Identity.lean` (parameterized on `H`, T11–T12), `Store.lean` (T7–T10).

**A second project only under a stated condition.** If the ruling on Q4 is that
the digest primitive gets its own bit-exact Lean model with its own correctness
argument, that is a second formal effort and takes a second Lake project —
proposed `formal/digest-primitive/`. `formal/lib/` appears only if those two
end up sharing code, which on the §3.5 structure they should not: the core
parameterizes on `H` and never inspects it.

Two toolchain notes. E1 pins its Lean toolchain through elan's
`lean-toolchain`, never through mise. And a coordination point worth deciding
early rather than discovering late: the Concrete clone pins
`leanprover/lean4:v4.28.0`. Matching it costs nothing now and is the difference
between "we could contribute this upstream" and "we would have to port it
first" (§5.3).

---

## 7. Open questions and pre-registered risks

Each carries the decision it blocks. Pre-registering them is the point: a risk
discovered later is a surprise, a risk written down first is a scope boundary.

### Open questions

**Q1 — Are recursive binding groups in scope?**
Mutually recursive definitions cannot be identified one at a time: a group must
be identified as a component, which forces strongly-connected-component
computation, a canonical intra-component order, and theorem T13. This is the
single largest hidden cost in all three options and the thing a small prototype
will quietly omit. Excluding cycles makes O1 substantially smaller; excluding
them makes O2 *impossible*, because Unison must handle them.
*Blocks:* the O1 term language definition and the O2 cost estimate. Must be
ruled before either starts.

**Q2 — What exactly is the declared equivalence?**
Alpha-equivalence is the floor. Candidates above it: literal normalization
(is `1` the same as `1.0`?), ordering of unordered constructs, erasure of type
annotations, eta-equivalence. Each addition strengthens the identity and makes
T4 (completeness) harder or false.
*Blocks:* T3, T4, and the whole canonicalizer design. Nothing can be proved
about an equivalence that is not written down.

**Q3 — Are types and data declarations in scope?**
§1.2 excludes typechecking, but Unison's term hashes depend on type hashes.
Under O1 the exclusion is free. Under O2 it is not: excluding types may make
conformance unreachable for any interesting definition.
*Blocks:* whether O2 is viable at E-L or is actually E-XL.

**Q4 — How is the digest primitive supplied?**
Options: an abstract parameter with no instantiation (proves the core, computes
nothing); a Lean-modeled primitive (second Lake project, §6.2); a native or
JavaScript primitive behind a named seam (cheap, trusted); or — the interesting
one — a Concrete-implemented primitive leaning on the `hmac_sha256` flagship
(§3.5), subject to R2 below.
*Blocks:* §6.2's project count, the trust statement's final shape, and whether
E1 produces a runnable tool at all.

**Q5 — Does canonical ordering force Mathlib?**
Canonical ordering of a recursive group (Q1) needs sorting with uniqueness and
permutation lemmas. Core Lean plus `Std` may suffice; it may not. AGENTS.md
says no Mathlib by default, so this is either a hand-rolled ordering theory or
an explicit, argued exception.
*Blocks:* the Lake project's dependency declaration — a decision that is
awkward to reverse once proofs are written against it.

**Q6 — Where is the claim boundary drawn under O3?**
If tree-sitter is trusted, claims are about the AST, and the source bytes are
carried by Content Digest alongside (§5.2). If claims are meant to be about
source *text*, the parser enters the trusted base of every claim and the
honesty of the whole scheme depends on a C library.
*Blocks:* whether O3 can be gated at all, and TOOLS.md admission for
`lean4-tree-sitter`.

### Pre-registered risks

**R1 — Concrete maturity.**
Concrete's `ProvableV1` subset excludes **recursion**, **heap-owning values**,
**allocation**, and **strings and text APIs**. A canonicalizer over a recursive
tree needs all four. The consequence is precise and should not be softened: the
canonicalization half of the UCM core **cannot be a proof-eligible Concrete
function today**. It can be *written* in Concrete — the clone ships a 1300-line
Lisp interpreter (`examples/mal`) and a 1183-line Lox interpreter
(`examples/lox`) — but those carry `enforced`, `reported`, or `tested_by_oracle`
evidence, never `proved_by_lean`. This is why the experiment is scoped as
"in *or alongside*" Concrete, and the realistic split is: Lean carries the
canonicalization theorems, Concrete is a candidate host for the *digest
primitive*, which its `ProvableV1` surface already supports because SHA-256
forced `u32` wrapping arithmetic, `bitand`, `shr`, and `shl` into it.
*Blocks:* Q4, and any framing of E1 as "build the UCM core in Concrete". That
framing is not currently available and the spec should say so before the
operator's time is spent on it.

**R2 — Concrete's shipped evidence needs verifying before it is relied on.**
An observation from the pinned clone, stated as an observation and not as a
verdict. `examples/hmac_sha256/README.md` states the expected status "11
verified, 0 failed". At the same revision, the checked-in snapshots
`examples/hmac_sha256/snapshot/proof-status.txt` and `fingerprints.txt` report
all eleven proof links as `unbound` — "not proved, and not stale: the body has
not been shown to change, it has never been pinned" — and
`examples/hmac_sha256/src/main.con` contains eleven `#[proof_by]` attributes
and zero `#[proof_fingerprint]` attributes. Those two surfaces disagree at this
revision. There are innocent explanations (the snapshots may deliberately
demonstrate the fail-closed path). The point is that the estate's own
discipline forbids believing either one without running the artifact.
*Blocks:* any reliance on Concrete's SHA-256 proof under Q4, and more
generally, any citation of Concrete's evidence in a foldlab claim. Resolution
is mechanical: build the clone, run `--report check-proofs`, record what it
actually prints.

**R3 — Unison hash-version drift.**
Unison versions its hashing scheme deliberately; the clone carries a package
named `unison-hashing-v2`, which is itself evidence that at least one scheme
transition has occurred. A conformance result is a result about **one scheme
version**, not about Unison. If the pin records only a binary version and not a
hashing-scheme version, every receipt is ambiguous the moment upstream moves.
*Blocks:* the shape of the O2 pin (§8) and the receipt format. Must be settled
before the first receipt is generated, because retrofitting a version field
onto existing receipts means regenerating all of them.

**R4 — Scope creep through the equivalence.**
The gravitational pull on every canonicalization project is toward a stronger
equivalence: first alpha, then literal normalization, then constant folding,
then "obviously equivalent" rewrites — at which point the declared equivalence
is undecidable, T4 is false, and the experiment has silently become a compiler.
*Blocks:* nothing immediately, which is exactly the danger. Mitigation is
procedural: Q2's answer is written into the ADR, and widening the equivalence
is a new experiment with a new ADR, never an amendment.

**R5 — The conformance lane becomes the experiment.**
Under O2, the differential harness is the largest single piece of work and the
one that produces no theorems. The failure mode is a well-maintained harness, a
satisfying pass rate, and a G1 spine that never got finished — an outcome that
*looks* successful and sits one gate below the point.
*Blocks:* nothing procedurally; mitigated by sequencing the G1 spine first
(§2's sequencing observation) and by refusing, in advance, to report a pass
rate as a headline result.

**R6 — Vocabulary collision with Source Provenance.**
"Content Digest" is owned and means bytes-as-stored. E1's central object is
deliberately *not* that. If the same word is used for both, the estate loses
the distinction that makes §5.2 worth anything, in the exact documents where it
matters most.
*Blocks:* the glossary artifact (§6.1) and the CONTEXT-MAP.md entry. Cheap to
fix now, expensive after the term has spread.

---

## 8. Evidence pins required before E1 starts

C6 applies: no assertion about external material without a resolved pin or an
explicit pending mark. E1 needs Source Lock additions that do not exist today.
Both relevant study clones are **Pending Sources**; their local identities are
recorded here as observations, not as pins.

| Pin needed | Observed locally | Required before |
|---|---|---|
| Unison repository, commit identity, and the specific `unison-hashing-v2` paths | clone at `84b95a623711b57b9ff7163f124b214d626b81e4` | any G2 or G3 work; any statement about Unison's algorithm |
| Unison release binary: version, platform, digest, **and hashing-scheme version** | none — no binary pinned | any G4 receipt (see R3) |
| Concrete repository and commit identity | clone at `28a25a4e27fd2eaed5193e5f1c1454e06399506f`, `leanprover/lean4:v4.28.0` | any citation of Concrete's capability or evidence (see R2) |
| SWHID specification version | none | any §5.2 claim beyond the structural comparison |
| Digest standard (FIPS 180-4 / FIPS 202, whichever Q4 selects) | none | any bit-exact primitive claim |

New TOOLS.md admissions required before their output enters gated work: the
Unison binary (oracle role, sampled evidence only, never a specification), and
under O3, `tree-sitter` as a named C FFI trusted seam.

---

## Appendix — what this draft did and did not read

Read: `AGENTS.md`, `CHARTER.md`, `CONTEXT-MAP.md`, `docs/lab-core/CONTEXT.md`,
`docs/lab-core/KINDS.md`, `docs/lab-core/TOOLS.md`,
`docs/effect-typescript-semantics/CLAIM-GATES.md`,
`docs/DEVELOPMENT-INVARIANTS.md`, `docs/provenance/CONTEXT.md`,
`.reference/provenance/sources.lock.json`, `.staging/README.md`, `README.md`,
`mise.toml`; and in the Concrete clone: `README.md`, `docs/IDENTITY.md`
(partial), `docs/PROVABLE_SUBSET.md`, `docs/PROVABLE_V1.md`, the
`examples/hmac_sha256` README and snapshot surfaces, and directory listings.

Not read, by instruction: `.staging/e1/concrete-capability.md`,
`.staging/e1/unison-hashing.md`. Statements in this document about Unison's
hashing algorithm beyond the structural level are marked pending and defer to
the latter.

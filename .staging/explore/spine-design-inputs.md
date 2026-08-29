# Spine design inputs — operator theses awaiting the design document

Running capture of design ideas raised in session, recorded so they reach the language design
document intact. These are inputs, not decisions.

## 1. Goal-directed, end-shape-first programming (operator, 2026-08-25)

Raised while reading the paper-ledger registration proposal. Operator's formulation, lightly
condensed: you'd program by defining the end shape of the thing you want — a ledger, say — and
then be forced to recursively define how it was put together: a union kind of things, each a
union kind of smaller things, bottoming out in atoms (digest, title, id). Then it "rolls up,"
and naming would create shared hash structure.

Decoded, this is three composable pieces:

1. **The sketch is an inductive type.** The nested union-kind description is an algebraic data
   type declaration; the ledger schema is an inductive definition (curriculum ch. 1).
2. **The workflow is typed-hole / type-driven development.** Declare `def x : EndShape := ?_`
   and the elaborator recursively demands the parts until holes bottom out in atoms. Prior art:
   Hazel, Idris ("type-driven development"), Lean's synthetic holes. Curry-Howard framing: the
   end shape is the theorem, hole-filling is the proof (curriculum ch. 8).
3. **"Shared hash structure" is structural type identity by content address.** Prior art:
   Unison's `structural type` — a type identified by the hash of its shape; independently
   authored identical shapes converge on one address; names are metadata. Spine extension:
   the carrier already Merkle-hashes terms; hashing type/shape definitions the same way gives
   schemas addresses, and cross-author structural sharing becomes a provable property rather
   than a convention.

**Dogfood corollary:** the lab's paper ledger (papers.lock.json + PAPERS.md + generator
pipeline) is a hand-run content-addressed database — digest identity, generated artifacts,
declared cluster roles, ratified registration. A candidate first real use of the spine
language: express the ledger's end shape in the language and replace the generator pipeline
with a spine program, receipts included. The registration sitting the operator is currently
doing by hand is the requirements document for that program.

## 2. Semantic discriminators for structural collisions (operator, 2026-08-25)

Operator's formulation, lightly condensed: ours is supposed to be dead simple and carry
semantic meaning — so for collisions you must give a discriminating token (a string), or you
can give a shape and a scope and say, within that scope, how to tell the difference between
those things.

Decoded as a ruling on the structural-identity dial:

- **Default structural**: same shape, same address, no ceremony.
- **Collisions resolved explicitly and semantically, never silently or randomly**: a same-shape
  pair is only admissible with a human-chosen discriminating string that enters the hash
  pre-image, or under a scoped discrimination rule declared for that shape.
- Kills both Unison failure modes at once: #3509 (a discriminator that existed but never
  entered the hash) becomes inadmissible by construction; `unique type` random GUIDs (identity
  not derivable from source text) are replaced by chosen semantic strings, restoring
  address-as-pure-function-of-source.
- The scope variant is a decidable well-formedness check at admission: no two same-shape
  definitions in one scope share a discriminator.

Candidate theorem ladder: **D1** admission decidability (checker admits or names the colliding
pair); **D2** scoped injectivity — distinct well-formed definitions get distinct pre-images
(framed-encoding F1/F2 + discriminator rule; the T1-keystone shape for our own scheme);
**D3** source-derivability — the address is a function of the written definition alone (a
theorem Unison's design cannot state).

Pinned cost, to be stated as a law in the design doc: the discriminating token is the one
deliberately identity-bearing string — the single carve-out from names-are-metadata. Renaming
never moves an address; changing a discriminator mints a new thing at a new address, on
purpose.

## 3. v1 domain ruling: a declarative JSON combiner over git-storable directories (operator, 2026-08-25)

Operator's formulation, lightly condensed: we make the discrimination mechanisms work by
limiting them very drastically — perhaps forcing the decision to an even higher scope, and at
that higher scope you must completely define how the lower scope operates, per kind. And it's
only for git-storable directories: basically a declarative JSON combiner, the goal being
minimal syntax that results in meaningfully, semantically declared nested JSON objects.

Decoded:

- **Mechanism restriction**: discrimination devices are narrow and boring by design; no
  free-form escape hatch (escape hatches are holes in theorems).
- **Policy totality at the parent scope**: a definition never rules on its own discrimination;
  the enclosing scope declares a TOTAL kind→policy map for everything the child scope can
  contain. Totality is decidable at admission — a partial policy is rejected with the missing
  kind named.
- **v1 domain reduction**: input = git-storable directory trees; output = canonical nested
  JSON with declared semantics; language = minimal declarative combinator, no general
  recursion. The "fun scripting language" (S4) becomes v2; this combinator is the v1 surface.

What the reduction buys (all provable for a small total combinator calculus in Lean):
determinism (same tree → byte-identical JSON), normalization (every program terminates),
canonical output bytes (deletes the CRLF/LF bug class hit by the ledger pipeline 2026-08-25).

**Dogfood target, now concrete: replace build_ledger.py.** Correspondences from the 2026-08-25
registration sitting — cluster roles = per-kind policy at the parent scope; generator error on
empty cluster = admission check; "exact partition of the directory" = totality; byte-identical
regeneration = determinism theorem; digest-pinned entries = addresses. The registration
proposal is the requirements document for the v1 program.

Prior art to absorb (none machine-verified — the standing gap): Dhall (non-Turing-complete
config → JSON; semantic hashing of normal forms for imports), Nix (Dolstra thesis in corpus),
Cue (per-kind policy as lattice unification).

Consequence for the owed constructor list: the v1 carrier is JSON-shaped, not a lambda
calculus — candidate frame: atom, object, array, reference-by-hash, combinator application,
kind annotation. The framed encoding, discriminator, and scoped-policy theses apply unchanged.

## 4. Scope shape: git tree by default, inductive shapes as the generalization (operator, 2026-08-25)

Operator's formulation, lightly condensed: it would assume the git tree unless you gave a
different recursively defining shape — and there's probably math that would allow you to
determine that, or another simplification.

Decoded, with the math named:

- A "recursively defining shape" is an inductive type; the git tree is one instance
  (directory = finite map from names to blob-or-subtree). The governing theory is polynomial
  functors / containers / W-types (Abbott–Altenkirch–Ghani lineage; Martin-Löf).
- **Admissibility is decidable and already implemented**: the legality check for a recursive
  shape is strict positivity — the exact check Lean's kernel runs on every `inductive`. Shape
  declarations = inductive declarations; the host kernel is the shape police.
- **Initiality does the proving**: folds (catamorphisms) out of an initial algebra are
  automatically total and uniquely determined. The declarative JSON combiner IS a fold, so
  thesis #3's determinism and termination theorems become one generic theorem inherited by
  every admissible shape.
- **v1 simplification (recommended, pending ratification)**: the tree is the ONLY scope shape
  in v1; any other recursive structure is represented in the value carrier (JSON + 
  reference-by-hash) as data, invisible to the scope system. Rationale: a verified
  datatype-generic framework buys v1 nothing the tree lacks, and the git tree is itself an
  instance of the carrier→encoding→address pattern (receipted first-hand in
  hash-db-anatomy.md §2) — the default shape doubles as the pattern's planetary-scale
  existence proof. v2 path: user shapes as positivity-checked inductive declarations under the
  generic fold theorem.

## 5. Owed inputs already flagged elsewhere

- The core calculus constructor list — named nowhere; first decision of the design document.
- The @[extern]/@[implemented_by] attribute-audit gate (lean-host-capabilities.md finding).
- Version placement for addresses: in-address vs in-preimage vs nowhere (hash-db-anatomy.md §7).
- Store the pre-image bytes, not a re-encoding (hash-db-anatomy.md §8 straw recommendation).
- AST-first vs grammar-first split named honestly (language-design-case-studies.md Part II).

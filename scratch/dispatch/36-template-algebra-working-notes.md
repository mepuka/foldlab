# Working notes — template-algebra investigation (dispatch 36)

Status: working notes for the exploratory design commission of 2026-08-17
(templating language modeled formally). Everything here is PROPOSED and
feeds `docs/research/2026-08-18-template-algebra-investigation.md`. New
files only; no standing record is edited.

## Reading ledger (read in place this session)

| Record | What was taken |
| --- | --- |
| coordination fabric part 1 | two-plane split; digest identity (C3); declared rights (C4); confidence tiers; refuse-lists as design instrument |
| action plane §2.2, C6, F7/F8 | context program = ordered (selector, renderer) pairs with volatility classes; assembly is a pure function; F7 proven in three halves (`F7AssemblyReadsOnlyDeclared`, `F7SegmentOrderStable`, `F7WithinClassOrder` — `verify/fabric/Fabric/Laws.lean:106-137`); F8 head-relative truth |
| agent plane §4 | schemas cataloged, referenced by digest (G26); constrained decode at the seam; commit-door conformance; §4.5 ontology = declaration kind, relations claims-tier (G27) |
| agent plane §15 | G36 three-class taxonomy: lattice join / checkpointed fold / register decision, over immutable values; context assembly graded "pure function"; split-don't-merge precedent |
| effect affordances | naming law: concept modules, no effect-barrel shadows (api-log 0018); `casJoinLoop` licensed once |
| concierge record §1 | fill/unfill on partials: C2 left-inverse at a path; L1 totality (SENSIBILITY); L4 commutativity class = path-disjointness; L5 frontier a function of state; L7 commit convergence (provenance soundness) |
| concierge record §3 | catalog search = meaning fold at a query algebra; **a query is a partial, holes are wildcards**; soundness free / completeness expensive; frontier refs = shape query |
| api-log 0017/0018 | no module minted without a concept; declared values over services |
| Dvořák notes + thesis §5 | Lean grammar precedent: closed inductive `Symbol`/`Grule`/`Grammar`, `Derives` = `ReflTransGen`, language as `Set (List T)`, closure proofs by structural induction; trusted-code presentation discipline |

## The load-bearing observations

1. **The estate already owns both halves of the object.** A context
   program (C6) is a template *without holes* — complete by
   construction, all selectors bound. The concierge partial (fill/unfill,
   L1–L7) is a typed-hole value *without a rendering target*. A
   Handlebars-class template is exactly the pushout: a context program
   with a typed-hole signature, filled by the concierge's algebra,
   rendered by F7's assembler.

2. **The concierge L4 is the partial-fill law in miniature.** "Two moves
   commute exactly when neither path is a prefix of the other" is the
   disjoint-fill commutation the commission asks for
   (`fill(fill(t,a),b) = fill(t, a∪b)` for disjoint `a,b`), already
   stated and consumed for parallel fan-out and rebase soundness.

3. **By-digest partials kill recursion for free.** Mustache/Handlebars
   allow recursive partials by name; a digest reference cannot form a
   cycle (preimage argument, the standing protocol-recursion ban). So
   rendering totality gets structural induction with no occurs-check,
   no fuel, no depth cap. This is the single cleanest estate dividend.

4. **Sections are binders — the honest wrinkle.** `{{#each xs}}{{this}}`
   introduces a scoped environment. Naive Handlebars semantics makes
   template meaning depend on a dynamic context stack (their `../`
   pathology). Two lawful responses: (a) second-order syntax (binding
   structure in the AST); (b) the estate move — refuse implicit scoping;
   a section takes a *declared renderer* (a fold digest) applied to the
   selected value. (b) keeps the AST first-order and the free-monad
   story intact; the cost is that per-item bodies are declared folds,
   not inline sub-templates — or inline sub-templates that are
   *closed* except for an explicit single parameter. Grill item.

5. **The honest algebraic home is the syntax monad, not an operad.**
   Named holes that may occur at several positions = variables; a
   template = a term over variables; fill = simultaneous substitution
   restricted to a partial valuation. Monad laws give T5 associativity;
   commutation of disjoint fills is a standard lemma. Operads/cartesian
   multicategories describe the same thing positionally and buy
   nothing extra here unless linear/positional holes are wanted.
   (Pending the prior-art hunt for citations; Fiore–Plotkin–Turi only
   becomes load-bearing if option (a) binding is chosen.)

6. **Search first is the same core, cheaper, with a live consumer.**
   Concierge §3.2 mode 2: the query language is the grammar itself; a
   partial IS a pattern; matching is a co-walk. Generative use (fill →
   value) and matching use (co-walk → result set) are the two module
   actions of one hole algebra. Search has a shipped consumer today
   (frontier refs, catalog query) while templates' consumer (agent
   context authoring at scale) is still arriving with M3+. The operator's
   phasing instinct is right and the record should recommend it.

7. **Digest-strictness relaxation that actually simplifies.** Three
   candidates, one adopted, two refused:
   - ADOPT: inline literals. Strict reference-by-digest would force
     cataloging every text fragment as a frame. Instead literals are
     leaves *inside* the template value; the template's own digest
     covers them. Identity discipline unbroken (the value is still
     canonical bytes), ceremony gone.
   - ADOPT (authoring only): names at the authoring surface — hole
     names and partial petnames in source, resolved to digests at
     admission through the existing directory; the *declared* value
     carries digests only. Names never survive admission.
   - REFUSE: name-based references inside declared values (reintroduces
     the mutable-meaning channel the estate exists to kill).

8. **Where state could enter, and why it must not.** Template = value;
   render = pure function (context-assembly class); fill = successor
   value, not mutation. The only stateful thing anywhere nearby is "the
   construction in progress," and that is the concierge session journal
   (class (b)) — reuse, never mint. A mutable template store or a
   "latest version" pointer is the directory's rebind (class (c)),
   already built. The template system itself needs no cell, no
   register: it lives entirely in the value / pure-function corner of
   G36. Any design that wants template state is smelling like a second
   canonicalizer and gets the directory-split treatment.

9. **The second-assembler refusal, confronted.** The verdict shape that
   survives: rendering is *defined* as compile-to-context-program
   followed by F7 assembly. There is no independent render function to
   wall because there is no second path — the compiler is the only new
   trusted piece, and its laws (compilation commutes with fill;
   compiled output digest determined by template digest + binding) are
   the record's T-series. Option (iii) full refusal would also refuse
   the fill algebra, which the concierge already ratified — so the
   refusal-flavored outcome is really "refuse any new assembler,
   keep the hole algebra," which is the recommended option said darkly.

## Candidate theorem sketch (T-series, all PROPOSED)

- T1 totality/refusal (parse-don't-validate at the template seam) — L1 + G26 pattern
- T2 determinism (template digest × environment → bytes) — F7 shape
- T3 disjoint-fill commutative monoid action — L4 generalized
- T4 fill/unfill retraction — concierge C2 verbatim
- T5 substitution associativity (syntax-monad bind) — classical
- T6 acyclicity of partial inclusion (digest preimage) — recursion ban inherited
- T7 substitution lemma: render(fill(t,a), e) = render(t, e ⊎ a); equivalently compile ∘ fill = bind ∘ compile — the law that makes "sugar" honest
- T8 (search half) pattern-match soundness: a returned digest re-derives and its structure co-walks the pattern — concierge §3.3 stated as a theorem

Naming: T-series here to avoid colliding with fabric F-numbers; homes
proposed in the record (`verify/` lane naming is the operator's call).

## Open questions carried to the grill sheet

- phase order (search-first vs template-first vs both-in-one)
- section binding: declared-renderer (first-order) vs binder syntax (second-order)
- hole naming: lexical strings vs digest-named schema references (leaning lexical names typed BY digest — `name : schema digest` pairs)
- helper grammar: closed set of declared folds only; no inline logic — is even `if/else` admitted, or is conditionality a renderer's job?
- compiler home: declared fold in the catalog (an estate value) vs package code
- does the template kind ride G12's one door as a declaration kind (the G27 ontology precedent) — almost certainly yes

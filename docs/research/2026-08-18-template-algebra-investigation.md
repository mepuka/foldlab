# A template algebra for the estate — investigation record

Status: **PROPOSED, pre-grill.** Commissioned 2026-08-17 as an
exploratory design lane — separate though not distinct from the Plait
program: every estate construct cited below is consumed at its recorded
status, and every conclusion is this record's own proposal, awaiting the
operator's grill. No implementation is proposed here and no tickets are
cut. Working notes: `scratch/dispatch/36-template-algebra-working-notes.md`.

The question, in one outsider sentence: *should the estate have a
Handlebars-like template language — text with typed blanks that programs
and agents fill in — and if so, what is it mathematically, and does it
earn a place beside the deterministic context assembler the estate
already has?*

Confidence tiers, used on every load-bearing claim, per the house rule:

| Tier | Meaning |
| --- | --- |
| **ratified** | cites a grill record or standing ruling |
| **proven** | cites a Lean theorem behind a green gate |
| **shipped** | cites code on main, read in place this session |
| **measured** | cites a ran-it result in a durable estate document |
| **proposed** | this record's own design; not yet grilled |
| **lead** | external claim; source fetched by the research sweep but not independently re-verified this session |

Glossary posture: estate terms are glossed at first use. For outsiders:
a **digest** is a SHA-256 hash over a value's canonical bytes, used as
that value's only identity; the **catalog** is the append-only journal
where declared values (types, programs, frames) are admitted and become
citable by digest; a **partial** is a half-built value whose remaining
blanks are typed **holes**; **fill/unfill** are the concierge's moves
that put a subtree into a hole and take it back out; a **context
program** is the estate's deterministic prompt assembler — an ordered
list of digest-anchored (selector, renderer) pairs whose output bytes
are a pure function of the program and its inputs (law F7, proven).

---

## 1. Result first — the six verdicts

**1.1 The formal object is real, small, and mostly already owned.** A
Handlebars-class template models cleanly as a closed inductive AST with
digest references and a typed-hole signature, and its algebra is the
**syntax monad**: holes are typed variables, filling is simultaneous
substitution, and the partial-fill laws the commission asked for
(disjoint fills commute and compose) are instances of substitution
lemmas that are classical, small, and in one case already stated in the
estate — the concierge's path-disjointness commutativity class L4
(shipped, 2026-08-14 concierge record §1.4). Fancier structure (operads,
cartesian multicategories) is available in the literature but buys
nothing beyond the monad laws for named, reusable holes; this record
refuses the decoration with citations in §6.

**1.2 The estate twist does real work.** Making every partial reference
a digest (never a name) makes template inclusion a DAG by the standard
preimage argument — recursive partials, the classic Mustache
non-termination hazard, are *unrepresentable*, and rendering totality
falls to plain structural induction with no occurs-check, fuel, or
depth cap (proposed; the argument is the estate's standing
protocol-recursion ban re-run). This is the single cleanest dividend of
modeling the language on estate identity discipline.

**1.3 The relevance verdict: no second assembler — a typed-hole skin on
the one assembler, licensed by laws the estate already ratified.** The
honest reading of the three commissioned options is a hybrid of (i) and
(ii) that takes (iii) seriously: rendering is *defined* as compilation
to a context program followed by F7 assembly, so no second render path
exists and nothing needs walling against drift; and the genuinely new
object — worth its own small law set — is the **typed-hole signature on
assembly programs plus the fill action**, i.e. partial application for
context programs. That algebra is the concierge's fill/unfill lifted
from type construction to context authoring; its laws are
instantiations, not novelties. Full refusal (iii) would have to refuse
an algebra the estate already ratified for partials, which is why it
loses — but its guard survives as a design law: **any independent
render function is refused as a second canonicalizer** (proposed, §5).

**1.4 Phasing: model search first.** The operator's instinct is
adopted as the recommended option. The concierge already states that a
catalog query *is* a partial used as a pattern — holes are wildcards,
matching is a co-walk (2026-08-14 record §3.2, mode 2). Generative use
(fill a hole → build a value) and matching use (co-walk a pattern →
select values) are two module actions of one hole algebra, and the
matching half is smaller, has a shipped consumer today (frontier refs,
catalog query), and its honest asymmetry — soundness free, completeness
expensive — is already written down. Modeling search first builds the
shared core (partials, holes, walks, signatures) against a consumer
that exists, and templates then arrive as the generative action of the
same object rather than a new lane (proposed, §7).

**1.5 Digest strictness relaxes at the authoring surface only.** Two
practical simplifications are adopted into the proposal: literals live
*inline* as leaves of the template value (the template's own digest
covers them; strict reference-by-digest would force cataloging every
text fragment as a frame, pure ceremony), and authoring may use
petnames (hole names, partial names) that resolve to digests **at
admission** through the existing directory — the declared value carries
digests only, so no name ever survives into identity. The refused
relaxation is names inside declared values: that reopens the
mutable-meaning channel the identity discipline exists to close
(proposed; the directory's bind/rebind split is the precedent).

**1.6 The two hunts returned opposite verdicts, both loud.** Hunt A:
direct formal treatments of Mustache/Handlebars-class languages number
**zero** — not thin, empty — so a modeled template algebra here would be
the first formal treatment of the language class, with mature adjacent
machinery to build on (§6). Hunt B: the architecture-level novelty
claim — "nobody has built full agent orchestration on pure CAS +
CRDTs" — **does not survive**: a 2026 system (grite, arXiv:2606.19616)
occupies that position and made the sweeping claim first. What survives
scrutiny, and what the publication lane should claim instead, is the
**derivation-and-proof** position: the coordination split *derived* by
CALM analysis and the lattice laws *machine-checked* rather than
property-tested (§8). Both hunt reports are lead-tier until re-verified
against primary sources.

---

## 2. The commission and its posture

The operator's charge: model a parameterized, Handlebars-like
templating language for the estate as a formal object — grammar as a
closed inductive AST, references by digest, "parameterized" as typed
holes with the concierge's fill/unfill made algebraic; state (not
prove) the candidate theorems with their licensing laws; then run the
honest relevance test against the standing context-program assembler,
with refusal a live outcome; then two prior-art hunts (formal
treatments of Mustache-class languages; full agent orchestration on
pure CAS + CRDTs). A same-day postscript directed that (a) an earlier
phase modeling *search* be considered, and (b) strict digest-basing be
relaxed where a relaxation is practically, highly simplifying. Both are
honored above as verdicts 1.4 and 1.5.

Three standing disciplines bind the lane: concepts are ratified before
machinery exists (this record is the pre-grill artifact); generated
vectors, not hand-typed, for any future model fixtures; claims sized to
evidence on the rung ladder. This record proposes no rung claims — it
contains statements, not proofs, and says so on each.

Reading base, read in place this session: the coordination fabric
record part 1; the action plane's context-assembly sections (C6,
F7/F8); the agent plane §4 and §4.5 (cataloged schema digests,
constrained decode, the G26 commit door, ontology declarations) and §15
(the G36 taxonomy); the effect-affordances naming rules and api-log
entries 0017/0018; the 2026-08-14 concierge record (fill/unfill,
L1–L7, catalog search); the Dvořák truth/beauty notes and thesis
chapter 5 (the Lean grammar-formalization precedent); the three proven
F7 statements (`F7AssemblyReadsOnlyDeclared`, `F7SegmentOrderStable`,
`F7WithinClassOrder`, `verify/fabric/Fabric/Laws.lean:106-137`).

---

## 3. The formal object

### 3.1 The grammar, as a closed inductive AST

The Lean shape follows the Dvořák precedent for grammar formalization
(closed inductive types, relations by structural induction, language
membership as set membership — thesis §5.2, read this session), and
the estate's own wire-grammar idiom. Sketch, stated in Lean 4 syntax
for precision; nothing here is implemented:

```lean
/-- A hole signature: finitely many named holes, each typed by the
    digest of a cataloged schema. Names are lexical (authoring-surface
    petnames); the *types* are digests. -/
def HoleSig := List (HoleName × SchemaDigest)   -- finite map discipline

/-- The template AST. Closed: these six constructors are the language.
    Every cross-artifact reference is a digest. -/
inductive Template : HoleSig → Type where
  | lit     : Bytes → Template Γ                      -- inline literal (verdict 1.5)
  | hole    : (h : HoleName) → (h, σ) ∈ Γ → Template Γ -- typed blank {{h}}
  | select  : Selector → RendererDigest → Template Γ  -- bound interpolation:
                                                      -- a digest-anchored read,
                                                      -- rendered by a declared fold
  | section : Selector → RendererDigest → Template Γ  -- block/iteration: the
                                                      -- renderer is applied
                                                      -- per-element; NO implicit
                                                      -- context stack (§3.4)
  | include : TemplateDigest → Binding → Template Γ   -- partial by digest, with
                                                      -- an explicit hole binding
  | seq     : List (Template Γ) → Template Γ          -- concatenation
```

Handlebars' five surface species map onto this exactly: text →
`lit`; `{{x}}` where `x` is a parameter → `hole`; `{{x}}` where `x` is
data → `select`; `{{#each}}`/`{{#if}}` → `section` with a declared
renderer; `{{> partial}}` → `include`. What does *not* map is
deliberate: helpers as arbitrary user functions (a helper here is a
**declared fold named by digest** — the estate's only notion of a
function with identity), and the implicit context stack with `../`
paths (refused, §3.4).

A **template is an immutable declared value**: admitted through the
catalog's one door like a type or a context program, its digest over
canonical bytes is its only identity, and `include` resolving only to
cataloged digests makes the inclusion graph a DAG by construction — the
catalog already enforces exactly this for type references (shipped,
`proto/SPEC.md` no-forward-refs rule; agent plane §4.1).

### 3.2 Typed holes and fill — the parameterized part

A template's signature Γ is its parameter list. Filling is the
concierge's move, made algebraic:

```lean
/-- A partial valuation: values for some subset of the holes, each
    value constrained-decoded against its hole's schema digest. -/
def Valuation (Γ : HoleSig) := (h : HoleName) → h ∈ dom Γ → Option (ConformingValue σ)

/-- fill: substitute values for the holes they cover; the result's
    signature is what remains. Simultaneous substitution — a hole name
    occurring at several positions is filled everywhere at once. -/
def fill : Template Γ → (a : Valuation Γ) → Template (Γ \ dom a)
```

Two design decisions are visible in the types and are grill items:

- **Holes are lexical names typed by digests** (not digest-named). The
  name is the authoring handle and the reuse key — `{{customer}}`
  appearing three times is one parameter; the *type* is the cataloged
  schema digest, which is what conformance and the certificate cite.
  This is verdict 1.5's relaxation applied at the one place it pays.
- **Fill is typed at the seam**: a valuation entry that does not
  constrained-decode against its hole's schema refuses structurally at
  fill time — parse-don't-validate at the template boundary, the G26
  commit-door discipline applied one layer earlier (ratified pattern).

A **complete** fill (empty remaining signature) yields a closed
template; only closed templates render. `unfill` is the concierge's
retraction, unchanged: it re-opens a hole and is a left inverse at a
path (shipped, concierge C2). A template mid-fill is not new state —
it is a successor value, and a construction-in-progress, if one wants
a journal of it, is a concierge session (class (b) in the G36
taxonomy), already built.

### 3.3 Rendering, and the candidate theorems

Rendering is **defined**, not implemented twice (verdict 1.3):

```
render(t, env) := assemble(compile(t), env)        -- F7's assemble; one assembler
```

`compile` maps a *closed* template to a context program: `lit` leaves
become static segments (the volatility-class story is inherited — a
compiled literal is `static`-class by construction), `select`/`section`
become the program's (selector, renderer) pairs, `include` splices the
referenced template's compilation under its binding, `seq` concatenates
in declared order. Compilation is itself a pure function of the
template value alone.

The candidate theorems, **stated and not proven** — each with the law
that licenses or patterns it. T-numbers are local to this record; homes
and final numbering are the grill's call.

| # | Statement (informal but exact) | Licensing law / pattern | Note |
| --- | --- | --- | --- |
| T1 | *Totality by refusal.* `fill` is total on well-typed valuations and refuses structurally otherwise; `render` is total on closed templates. No closed well-typed template fails to render. | concierge L1 (SENSIBILITY: every reachable partial is well-formed); G26 constrained decode | the parse-don't-validate statement at this seam |
| T2 | *Determinism, the F7 shape.* `(template digest, environment values)` determines output bytes: equal digests and equal inputs give byte-equal renders. | F7's three proven halves, inherited through `compile` — needs only: `compile` is a function of the template value | with T7 this is a corollary, not a new proof burden |
| T3 | *Disjoint-fill commutation and composition.* For valuations `a, b` with disjoint domains: `fill (fill t a) b = fill (fill t b) a = fill t (a ⊎ b)`. Fill is a commutative monoid action of partial valuations under disjoint union on templates over a fixed signature family. | concierge L4 (path-disjoint moves commute) generalized from paths to name-sets | the sloppy-safe property in miniature: fill *order* is irrelevant, only the fill *set* matters — the same shape as F1/F2's set-not-schedule story, though here it is plain substitution, no lattice needed |
| T4 | *Retraction.* `unfill (fill t {h ↦ v}) h = t` for `h` open in `t`. | concierge C2, verbatim | inherited, not new |
| T5 | *Substitution associativity.* Filling a hole with a template-with-holes, then filling those, equals composing the substitutions first: the bind law of the syntax monad — equivalently the composition axiom of an abstract clone. | classical (free-monad/substitution lemmas; the clone axioms — §6 citations) | this is where "templates compose" lives; §6.3 settles the operad question |
| T6 | *Inclusion acyclicity.* The `include` reference graph is a DAG; no template contains itself at any depth. | digest preimage argument; the standing protocol-recursion ban; catalog no-forward-refs (shipped) | free by identity discipline; kills the Mustache recursion hazard |
| T7 | *The substitution lemma / compilation coherence.* `compile (fill t a) = bind (compile t) a` — filling then compiling equals compiling then substituting into the program. Equivalently at the render level: `render (fill t a) env = render t (env ⊎ a)`. | the law that makes "sugar" honest: it says the template layer adds nothing the assembler cannot see | the one genuinely new proof obligation of the lane; everything else leans on it |
| T8 | *Match soundness (the search half).* A digest returned by a pattern query re-derives and its structure co-walks the pattern; completeness only relative to a named catalog head. | concierge §3.3 stated as a theorem (soundness free, completeness expensive) | first theorem of the search-first phase (§7) |

### 3.4 The binding question — sections without a context stack

Handlebars sections are *binders*: `{{#each xs}}{{this}}{{/each}}`
introduces a scoped environment, and the `../` escape makes template
meaning depend on a dynamic context stack. Formally that forces
second-order syntax (binding-aware ASTs — the Fiore–Plotkin–Turi
lineage, §6) and operationally it is the part of Handlebars users
cannot predict. The estate answer proposed here: **refuse the implicit
stack**. A `section` names its per-element renderer by digest — a
declared fold, or a *closed* sub-template over exactly one explicit
parameter. Every reference inside a section body is either that
parameter or digest-anchored; nothing is captured from the enclosing
render silently. The AST stays first-order, the syntax monad story of
§3.3 holds without second-order machinery, and the `../` pathology is
unrepresentable. Cost: per-item bodies are one hop less convenient to
author. Priced as grill item GT-4.

### 3.5 Graded against G36 — where state would enter, and why it must not

Per the taxonomy's design law (agent plane §15, PROPOSED as G36):

| Structure | Class | Law / path |
| --- | --- | --- |
| template | **value** | catalog admission; digest is identity; upgrades are successor declarations |
| valuation / fill result | **value** | a successor value, never a mutation |
| render | **pure function / derived read** | T2/T7 over F7; memoized by `(template digest, input digests)`; no invalidation exists |
| construction-in-progress | **(b) checkpointed fold** | the concierge session journal — reuse, never mint |
| name → template "latest" pointer | **(a)+(c) split** | the directory's bind/rebind, already built — no template-specific version store |

There is no lattice cell and no register anywhere in the template
system: it lives entirely in the value / pure-function corner of the
taxonomy, and that is the answer to "where would state enter" — it
enters only if the design smuggles in a mutable template store or a
"current version" pointer, both of which are existing constructs
(session journal; directory) the moment they are actually wanted. A
template system that mints its own state carrier has failed the G36
shape test and gets the directory-split treatment (ratified precedent).

---

## 4. The relevance test, argued honestly

The estate already assembles context deterministically: context
programs are digest-anchored, F7-walled, volatility-ordered, and their
cache needs no invalidation. The commission demands this record confront
whether a Handlebars-like surface is (i) DX sugar over that assembler,
(ii) a distinct object with its own laws, or (iii) refused outright
under the standing second-canonicalizer-class refusal.

**The case for (iii), stated at full strength first.** The estate has
refused parallel machinery before on exactly this shape: a second way
to produce the same bytes is a drift channel, and every drift channel
eventually needs a wall, a reconciliation story, and an owner. A
template language whose render function is written beside the assembler
would be a second canonicalizer of "what does this program say to the
model" — and the fact that its output is *prompts* makes drift worse,
not better, because prompt drift is invisible until behavior changes.
If the proposal were "a templating engine," (iii) should win.

**Why (iii) does not win whole.** Two of its premises fail on
inspection. First, there is no second render function in the proposal:
`render := assemble ∘ compile` (§3.3) leaves exactly one assembler, and
T7 is precisely the statement that the template layer is conservative
over it. Second, the typed-hole half is not new machinery to refuse —
fill/unfill on partials is ratified, shipped concierge behavior; what
templates add is only the *application* of that algebra to context
programs. Refusing (iii) whole would mean refusing an algebra the
estate already runs.

**Why (i) alone undersells.** Pure sugar — new syntax, zero new laws —
would leave the fill algebra unstated, and unstated algebra is how
sloppy-safe properties get lost in implementation. The partial-fill
laws (T3, T5, T7) are cheap to state, are the exact license for the
things one actually wants to *do* with parameterized context (fill a
fleet-shared program's seat parameter per node; fill the turn
parameter last; branch a half-filled program per experiment arm), and
context programs today have no parameterization story at all — a
program is complete by construction. That last gap is real: what
templates add to the estate is **partial application for context
programs**, and that is an object with laws, not a syntax.

**Verdict: (i)+(ii) hybrid, with (iii)'s guard adopted as law.** The
surface compiles to the one assembler (i); the typed-hole signature and
fill action are a small distinct algebra worth stating (ii), whose laws
are instantiations of ratified estate laws plus one new obligation
(T7); and the (iii) refusal survives as a standing design constraint:
no independent render path, ever — any future "fast renderer" or
"preview renderer" must be the same `compile` into the same `assemble`
or it is refused on sight (proposed).

**Where the compiler lives, and what walls it owes.** The compiler is a
pure function from template values to context-program values — which
makes it, in estate terms, a candidate **declared fold** whose own
digest enters any certificate that cites a compiled program
("assembled from program P, compiled from template T by compiler C").
Its wall is not served-equals-derived (there is no second derivation to
compare) but the T7 coherence suite run as generated vectors: model
emits (template, valuation) pairs, both compile-then-substitute and
substitute-then-compile paths run, bytes compare. Home — package code
vs cataloged declared fold — is priced as grill item GT-6.

---

## 5. What the digest discipline refuses to relax

Stated as a short refuse-list, since §1.5 already states the two
adopted relaxations (inline literals; authoring-time petnames resolved
at admission):

- **Names inside declared values.** A template value that references a
  partial or schema by name has mutable meaning; refused.
- **An independent render function** (§4). Refused as a
  second-canonicalizer.
- **Implicit context capture in sections** (§3.4). Refused; binding is
  explicit or absent.
- **User-defined helper logic in templates.** A helper is a declared
  fold with a digest, or it does not exist. The template grammar stays
  logic-less in exactly Mustache's sense, for CALM-adjacent reasons:
  everything a template does is a pure function of declared inputs, so
  templates never acquire an evaluation order worth coordinating.
- **Hole defaults.** A hole with a default is two declarations (a
  template, and a successor with the hole filled); defaults inside the
  signature reintroduce the ambiguity fill exists to kill.

---

## 6. Prior art — hunt A: formal treatments of Mustache/Handlebars-class languages

All entries lead-tier: sources fetched by the commissioned sweep
(2026-08-17), not independently re-verified this session. Items the
sweep could not confirm are marked UNVERIFIED and omitted from any
load-bearing role.

### 6.1 The thinness assessment, stated plainly

**Direct formal or mechanized treatments of Mustache, Handlebars,
Jinja2, Liquid, or any "logic-less" template language: zero.** The
sweep searched by language name, by "logic-less," by proof assistant ×
engine name, by venue, and by generic phrasing; every hit was either
practitioner material or an unrelated sense of "template." Two
sharpening findings: the Mustache "spec" is a YAML conformance test
suite — there is no grammar production or rendering judgment anywhere
in it, so anyone writing a semantics writes the first; and the word
"template" is search-poisoned (C++ templates, logic-formula templates,
Template Coq), which future re-runs of the hunt should expect.

The field is empty; the *adjacent* fields are rich. The gap is real,
and a closed inductive AST with typed holes, a fill operation, and
proved clone/monad laws would — as far as the sweep can determine — be
the first formal treatment of this language class.

### 6.2 The ledger (condensed to the load-bearing rows)

| Work | Year | What it gives this lane | Mechanized? |
| --- | --- | --- | --- |
| **JWIG** (Christensen–Møller–Schwartzbach, TOPLAS) | 2003 | the nearest structural ancestor: XML templates with **named gaps** and a **plug** operation as first-class data; correctness = schema validity via dataflow analysis. Nobody ever axiomatized plug — that is exactly this record's delta | on paper |
| XACT; Static Validation of XSLT (Møller et al.) | 2004/2007 | the same Aarhus line: schemas-as-types for template values works; still analysis, not algebra | on paper |
| **Samuel–Saxena–Song** (CCS '11) | 2011 | the only type system over real templating languages: context type qualifiers for auto-sanitization — the precedent for typing holes by output position | on paper |
| Google Closure strict autoescaping / Trusted Types | 2010s | deployed content-kind lattice; "recursively guaranteed not to underescape" is asserted, never proved | no |
| Ur/Web (Chlipala, PLDI '10 / POPL '15) | 2010/15 | the typed *alternative*: replace templating with a typed language; records-as-context | on paper |
| MetaML (Taha–Sheard); LMS; Typed Template Haskell spec | 1997–2021 | the principled cousin (staged computation): generated artifacts well-typed by construction — the guarantee string templating structurally lacks; related-work material, not a theorem source here | on paper |
| Flatt, *Binding as Sets of Scopes* (POPL '16); Kohlbecker '86 (UNVERIFIED direct) | 1986/2016 | the hygiene literature — load-bearing **only if** sections become real binders; §3.4's refusal makes it skippable | on paper |
| TRX (Coq PEG); Jourdan–Pottier–Leroy (Coq LR(1)); Lasser (Coq LL(1)) | 2010–19 | verified-parsing precedent if the *surface parser* is ever verified; PEG fits Mustache-style delimiter scanning | **Coq** |
| Danielsson (Agda pretty-printing); **Narcissus** (Coq); **EverParse** (F\*) | 2013–19 | the round-trip / inverse theorem shapes; EverParse's **non-malleability** (unique representation) is the cleanest existing statement of render-injectivity, if that theorem is ever wanted | **Agda/Coq/F\*** |
| **Fiore–Plotkin–Turi** (LICS '99) | 1999 | substitution as algebraic structure; simultaneous substitution derived by structural recursion, with correctness — the legitimacy of the whole move | on paper |
| **Hamana** (APLAS '04) | 2004 | free Σ-monoids with **metavariables**: "a term with holes is the free object" — the typed-holes claim, published | on paper |
| **Fiore–Szamozvancev** (POPL '22) | 2022 | mechanized (Agda) metatheory of syntax with substitution/metasubstitution — the engineering blueprint for the Lean development's shape | **Agda** |
| nLab `clone` (via Kelly–Power, Staton, FPT) | — | the equivalence that settles §6.3 | reference |

MLj, WASH, iData/iTasks: UNVERIFIED — the sweep ran out of budget
before fetching them; they are not cited anywhere load-bearing here.

### 6.3 The operad question, closed

The commission asked whether multi-hole template composition is "an
operad / cartesian multicategory — say so plainly and cite, or refuse
the fancy structure with a reason." The answer is a refusal backed by a
theorem, not by taste: an **abstract clone** — a family `T(n)` with
projections and composition `T(m) × T(n)^m → T(n)` under three axioms —
is *exactly* "a template with m holes, given m templates with n holes,
yields a template with n holes," and abstract clones, cartesian
operads, one-object cartesian multicategories, Lawvere theories, and
finitary monads are **all equivalent** (lead; nLab `clone`, citing
Kelly–Power and Fiore–Plotkin–Turi). Choosing operad vocabulary buys
zero additional lemmas. Operadic language would earn its keep only for
*linear* holes (used exactly once, no duplication or dropping) — and
Handlebars-class templates are emphatically cartesian: a partial runs
inside `{{#each}}` (duplication) and inside a falsy `{{#if}}`
(dropping). Cartesian means clone means monad. The Lean rendering: a
plain inductive family with the three composition laws proved by
structural induction — no category-theory imports to state a
twenty-line result. T3/T5's monad laws *are* the clone axioms.

---

## 7. Search as the earlier phase — the recommended entry point

The operator's postscript asked whether the lane should start earlier,
by modeling e.g. search. The answer this record recommends: yes, and
the estate's own documents nearly say so already.

The concierge record's §3 establishes (shipped design, partially built):
a catalog query is the meaning fold at a query algebra; **the query
language is the grammar itself — a query is a partial, holes are
wildcards**; matching is a co-walk of pattern against structure; result
soundness is free (each row re-derives) while completeness is priced
(re-fold to a named head). The frontier's ref advertisement and MCP
argument completion are the same query fold served twice.

Put beside §3 of this record, the symmetry is exact. One core object —
a value-with-typed-holes over the estate grammar — supports two module
actions:

| Action | Use | Consumer today |
| --- | --- | --- |
| **fill** (generative) | build values; parameterize context programs | concierge sessions (shipped); templates (this record, proposed) |
| **match** (eliminative) | select values; a pattern denotes the set of values it co-walks | catalog query, frontier refs (designed, partially built) |

The two actions share their carrier (partials), their typing (schema
digests at holes), their commutation story (path-disjointness), and
their identity story (patterns are content-addressed values — a query
has a digest, so a *search* is citable and cacheable by
`(query digest, catalog head)`, already stated in the concierge
record). The natural first theorems are T8-family: match soundness;
pattern/fill adjunction (a filled value matches every pattern that its
unfilled ancestor refines — the Galois-connection shape between "more
filled" and "matches fewer patterns"); and match stability under
catalog growth (monotone in the head — the CALM-friendly half; the
non-monotone "is this everything?" is exactly the completeness cost
already priced).

Why this phase order wins: the search half has a **shipped consumer
and a smaller trusted surface** (no rendering, no compilation, no
environment) while exercising every piece the template phase needs
(signatures, holes, walks, conformance at the seam). And it de-risks
the template verdict: if the hole algebra earns its laws against the
search consumer, the template lane inherits a proven core and adds only
`compile` and T7. The reverse order would build the larger surface
first against the consumer that arrives latest.

Phasing is priced as grill item GT-1, recommended option: search first.

---

## 8. Prior art — hunt B: agent orchestration on pure CAS + CRDTs

All entries lead-tier (sweep-fetched 2026-08-17). This section carries
the investigation's most consequential finding and it is adverse:
**the architecture-level novelty claim is lost.** The publication lane
(R2 ambition, standing) should read §8.2–8.4 before any splash-post
sentence is drafted.

### 8.1 The ledger

| System | Coordination substrate | Orchestrates, or replicates state only? | Bearing on the claim |
| --- | --- | --- | --- |
| **grite** (neul-labs; arXiv:2606.19616, June 2026) | append-only WAL in `refs/grite/wal`; event ids = BLAKE2b content addresses; CBOR + optional Ed25519; CRDT projection (LWW + commutative-set); TTL leases at `refs/grite/locks/<resource_hash>` by CAS on a git ref; "no server and no agreement round" | **both** — task-pool evaluation with lease-acquiring agents | **refutes the claim as stated**: CAS-register decisions + CRDT knowledge + no consensus, aimed at AI coding agents |
| CodeCRDT (arXiv:2510.18893) | Yjs CRDTs over a centralized relay; exclusivity squeezed from LWW write-then-verify (50 ms wait) | both | near miss: decisions derived from LWW, not a CAS register; centralized relay; no content addressing |
| Beads (Yegge) | git as database; work as dependency DAG | task tracking for agents | git-CAS-adjacent; no lattice, no lease primitive |
| Lasp (Meiklejohn) | CRDT dataflow, coordination-free, SEC | **state only** (flagship eval: an ad counter) | the suspected closest hit is not close: no decision mechanism, never orchestrated agents |
| Anna / Cloudburst | coordination-free lattice actors / stateful FaaS over Anna | storage / function composition | proves the ACI knowledge plane is old; no orchestration |
| Hydro, "Keep CALM and CRDT On" (VLDB '22) | compiler stack; CALM decides which queries are coordination-free | neither | closest to the CALM half; reasons about queries, builds no orchestrator |
| "When Coordination Is Avoidable" (arXiv:2602.18673) | analysis only — CALM × task-interdependence taxonomy; no implementation | neither | the CALM-applied-to-agent-work *idea* is published; the system is not |
| LVars (Kuper); Katara (OOPSLA '22) / VeriFx | monotone lattice writes / verified CRDT synthesis | neither | lattice-monotone accumulation and verified-lattice-laws prior art — for design, not for a harness |
| Bazel RBE / Buildbarn; Nix ca-derivations; Bacalhau/IPVM | CAS-keyed artifacts, **central scheduler** | orchestrate deterministic tasks | the strongest CAS+orchestration contrast: no CRDT plane, no contention between autonomous writers (Buildbarn scheduler internals UNVERIFIED) |
| Unison; DXOS ECHO; Automerge/Yjs/Loro/cr-sqlite | content-addressed code / CRDT sync | distribute/replicate | no exclusive-decision primitive anywhere in the local-first stack |
| Linda tuple spaces (1985) | shared associative space; atomic destructive `in` | **orchestrates** — the historical ancestor | the exclusive-claim primitive is 40 years old; content-*matched*, not content-*addressed*; no lattice merge |
| Temporal/Cadence; Restate, DBOS, Inngest, Resonate, Step/Durable Functions | sharded central DB / replicated-log durable execution (per-system specifics UNVERIFIED) | orchestrate | the consensus-backed contrast class |
| etcd/ZooKeeper lease-and-lock | CAS on keys, **Raft/ZAB-backed** | orchestrates | the sharpest contrast: Plait's register API shape on the opposite substrate — name it explicitly in any paper |
| LangGraph / AutoGen / CrewAI | central checkpointer DB / message history | orchestrate | the mainstream agent field is entirely central-DB; no CAS, no CRDTs |

### 8.2 The nearest miss that is a hit

grite has every structural element: content-addressed append-only log,
CRDT reconciliation, TTL-bounded advisory leases acquired by CAS,
serverless and consensus-free, targeted at AI coding agents — and its
own novelty sentence ("no prior system unifies conflict-free
concurrent agent edits, advisory leases, and a signed,
content-addressed, mineable history in a server-less git substrate") is
close to a paraphrase of the claim under test. A reviewer finds it on
the second query.

What grite verifiably lacks, per targeted extraction: **no CALM
reasoning anywhere** (the split is an engineering choice, not derived);
**no proved laws** (convergence by property-based testing, explicitly);
LWW rather than a general join-semilattice (information-discarding);
no two-plane vocabulary; leases advisory with the concession stated;
evaluation on seeded deterministic agents, not real LLM agents;
pre-1.0 maturity.

### 8.3 The verdict for the publication lane

"Nobody has combined CAS-register decisions + a CRDT knowledge plane +
CALM reasoning into a full agent orchestration harness" is **not
defensible as written** — publishing it invites a one-link rebuttal.
Each *component* also has a canonical citation the estate should expect
to be held to: lattice knowledge accumulation (Anna, LVars, Lasp);
CALM-derived coordination avoidance (Hellerstein–Alvaro; "Keep CALM and
CRDT On"); CALM-classified agent tasks (arXiv:2602.18673,
analysis-only); CAS task graphs (Bazel, Nix); exclusive claiming from a
shared pool (Linda `in`); verified lattice laws (Katara, VeriFx).

The qualifiers that survive, in descending strength:

1. **Machine-checked lattice laws in a running harness.** No system
   found combines a *proved* join-semilattice knowledge plane with
   agent orchestration — grite tests, Katara/VeriFx prove but
   orchestrate nothing, Lasp/Anna assert. The estate's mechanized
   theorem set over the actual operators is, on this sweep, unmatched.
2. **CALM as the design method that derives the split** — verifiably
   absent from grite and every agent framework; present in the
   literature only as compiler theory or unimplemented classification.
   Nobody has closed the loop from CALM analysis to a shipped harness.
3. **General join-semilattice merge rather than LWW** — a stronger and
   distinguishable position worth stating as such.

Safe formulation, proposed for the lane: *"Plait is, to our knowledge,
the first agent orchestration harness in which the
coordination/no-coordination split is derived by explicit CALM analysis
and the knowledge plane's join-semilattice laws are machine-checked
rather than asserted or property-tested. The closest prior system,
grite, shares the CAS-log + CRDT-merge + lease-register architecture
but establishes convergence by testing and performs no monotonicity
analysis."* Concretely: cite grite in related work; move the novelty
claim from architecture to **derivation and proof**. The architecture
claim is lost; the proof claim is clean.

### 8.4 What this does to this record's own framing

Nothing in §§3–5 depends on the architecture claim — the template
algebra stands on estate-internal license. But the finding sharpens the
estate's general posture this record inherits: the durable novelty
currency here is *proved laws surfaced as capabilities*, not
architectural composition, which is one more reason the template lane's
value is its T-series and not its syntax.

---

## 9. Risks and honest bounds

1. **Second-surface drift by another door.** Even with render defined
   as compile∘assemble, the *authoring* surface (names, sugar) is a
   second way to write programs, and sugar accretes. Bound: the
   refuse-list (§5) plus the closed grammar — six constructors, growth
   by ruling only (the C9 trigger-grammar precedent).
2. **Scope creep toward a programming language.** Every template
   language in industry grew conditionals, loops, and eventually
   user code. The proposal's guard is structural (helpers are declared
   folds only; no inline logic) but the pressure is social; the grill
   should decide now what the answer to "can we just add an `#if`" is.
   This record's proposal: conditionality is a renderer's job, always.
3. **No theorem touches prompt quality.** T-series governs identity,
   composition, and provenance — never whether a template selects
   *good* context. Same fence as F7's "not claimed" box (ratified
   phrasing); any quality claim would be an overclaim.
4. **The binding restriction may not survive contact with authors.**
   §3.4's explicit-parameter sections are algebraically clean and
   ergonomically stiffer than Handlebars. If real authoring shows the
   stiffness matters, the escape is second-order syntax — a real cost
   (new binding metatheory) that should be priced then, not smuggled
   now. Reversal: the first-order AST embeds into the second-order one;
   templates declared under the restriction stay valid.
5. **Prior-art bounds.** Sections 6 and 8 carry lead-tier external
   claims from the commissioned sweeps; anything load-bearing for a
   publication sentence must be re-verified against primary sources
   before that sentence ships (standing verification-lane rule). The
   grite finding (§8.2) is the urgent instance: re-verify
   arXiv:2606.19616 and the repo directly before any novelty sentence
   is drafted or retired — the sweep's own fetches were consistent, but
   the stakes are publication-lane.
6. **First-mover cuts both ways.** §6's empty field means no prior
   semantics to disagree with — and no prior semantics to lean on. The
   language-half design decisions (§§3.1–3.4) have no external
   referee; only the algebra half does. The grill is the referee.
7. **Search-phase completeness is priced, not free.** T8's completeness
   is relative to a catalog head and costs a re-fold; nothing here
   changes the concierge's honest asymmetry, and no "the index is
   complete" claim exists at any tier.

---

## 10. The grill sheet

House style: one decision per item; recommended option first;
alternatives priced; reversal cost stated. All items PROPOSED.

**GT-1 — phase order.** Recommended: **search first** (§7): model the
hole algebra against the catalog-query/frontier consumer; templates
follow as the generative action plus `compile`/T7. Alternatives:
templates first (larger trusted surface against the latest-arriving
consumer); both at once (one lane, two consumers, slowest to any
green). Reversal: the core is shared by construction; switching order
mid-lane re-sequences work without discarding statements.

**GT-2 — is the template a declaration kind?** Recommended: yes — one
more kind through G12's one door, the G27 ontology precedent applied
verbatim (a canonical value, certifier-admitted, digest identity,
lineage by successor declarations). Alternative: templates as blobs
with a naming convention (no citable identity; certificates cannot name
them; refused by the same argument G26 used for anonymous schemas).
Reversal: a declaration kind that never ships machinery is a dead
grammar production — cheap to retire before consumers exist.

**GT-3 — hole naming.** Recommended: lexical names typed by schema
digests (`name : σ` pairs in the signature; a name occurring at several
positions is one parameter). Alternatives: digest-named holes (maximal
strictness; unusable authoring, and the name *is* authoring surface —
it never enters any identity but the template's own); positional holes
(the operad-flavored option; loses reuse-by-name and buys nothing —
see §6). Reversal: renaming holes is a successor declaration; the
signature is data.

**GT-4 — section binding.** Recommended: no implicit context stack;
sections apply a digest-named renderer or a closed one-parameter
sub-template (§3.4). Alternative: Handlebars-style scoped context with
`../` (authoring convenience; costs second-order syntax in the model
and unpredictable capture in practice). Reversal: first-order templates
embed unchanged if binding is ever admitted; the reverse migration
would not exist — which is itself the argument for starting strict.

**GT-5 — helper discipline.** Recommended: helpers are declared folds
referenced by digest; the template grammar carries no inline logic, and
conditional/iterative presentation is always a renderer's declared
behavior. Alternative: a small built-in helper set (`#if`, `#each` as
grammar productions — every industry template language's first step
toward a second programming language). Reversal: admitting a built-in
later is a grammar ruling; removing one after authors use it is a
breaking retirement — asymmetry favors starting closed.

**GT-6 — where the compiler lives.** Recommended: the compiler is
package code whose coherence suite (T7 as generated vectors:
fill-then-compile vs compile-then-substitute, byte-compared) gates in
CI, and whose *identity* (a digest over its declared behavior) enters
certificates that cite compiled programs. Alternative: the compiler as
a cataloged declared fold executed by the estate's own machinery
(maximal dogfooding; blocked on machinery this lane must not build
ahead of ratification). Reversal: promoting package code to a declared
fold later is additive.

**GT-7 — the digest-relaxation pair (§1.5).** Recommended: adopt both
(inline literals; authoring petnames resolved at admission), refuse the
rest (§5). Alternative: full strictness (every literal a cataloged
frame — ceremony with no identity gain, since the template digest
already commits the bytes). Reversal: inlined literals can be hoisted
to frames mechanically at any time (a successor declaration); the
reverse is also mechanical — this is the cheapest reversal on the
sheet.

---

## 11. Sources

Estate records, read in place this session: as listed in §2. External,
read directly: Martin Dvořák, *Pursuit of Truth and Beauty in Lean 4*,
PhD thesis, ISTA, March 2026, arXiv:2602.12891v3 (CC BY 4.0), chapter
5 read from the PDF; the estate's excerpt record
`docs/research/2026-08-18-dvorak-truth-beauty-notes.md`.

External, lead-tier (fetched by the commissioned sweeps 2026-08-17,
not independently re-verified) — the five load-bearing citations for
the template algebra, per §6:

1. Fiore, Plotkin, Turi, *Abstract Syntax and Variable Binding*,
   LICS '99 — substitution as algebraic structure.
2. Fiore, Szamozvancev, *Formal Metatheory of Second-Order Abstract
   Syntax*, POPL '22 (Agda) — the mechanization blueprint.
3. Hamana, *Free Σ-Monoids*, APLAS '04 — terms-with-metavariables as
   free objects: the typed-holes claim.
4. nLab, `clone` (Kelly–Power; Staton) — clone ≡ cartesian operad ≡
   Lawvere theory ≡ finitary monad: the operad refusal.
5. Christensen, Møller, Schwartzbach, *JWIG*, TOPLAS 2003 — templates
   with named gaps and plug: the prior art whose delta this record
   states (they analyzed plug; nobody axiomatized it).

And for hunt B, the two the publication lane must read first: grite
(github.com/neul-labs/grite; arXiv:2606.19616) and "Keep CALM and CRDT
On" (VLDB '22, arXiv:2210.12605). Full source lists for both sweeps,
with every fetched link, are preserved in the working notes' companion
(the sweep reports are reproduced in
`scratch/dispatch/37-template-algebra-prior-art-reports.md`).

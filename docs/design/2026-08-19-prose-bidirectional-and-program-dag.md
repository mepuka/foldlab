# The bidirectional prose register and the program meta-language DAG AST

Date: 2026-08-19. Status: **EXPLORATORY, PRE-GRILL.** Drafted by a
design seat at `origin/main` `8389a53e5419`. It rules nothing; the
operator rules. It changes no code, no gate, no corpus row, no ticket.
Its only write is this file.

**The commission, verbatim intent (operator, this session):** *prose is
parseable into machine code just like anything else; the programming
language is definable in prose; a Lean DAG AST for the program
meta-language, implemented in TS for UI affordance.* Two scope
additions arrived with the dispatch and are carried as §3 and §5: the
dependency/environment plane joins the DAG, and a surface notation
*"so it looks cool like Haskell"* — for fun and for the UI.

**What this record is not.** Not a build plan, not a ticket source, not
machinery. No vocabulary is minted here: every proposed term wears a
grill row in §6 and stays a proposal until the operator rules. Every
law-shaped statement is marked **CANDIDATE** and none is claimed.

**Law 10 and this file.** Law 10 forbids tracking artifacts — repo-local
ids, paths, commands — on any surface rendered *outward*. A design
record is tracking-land, not an official document, so path citations
and command names are lawful here and are used throughout. Nothing in
this file is a projection source; if a sentence below is ever promoted
to a rendered surface, it loses its citations on the way.

---

## 0. Orientation for a reader from outside

Eleven words carry this record. Each is glossed once, here, and used
plainly thereafter.

- **Digest** — the hash of a value's one canonical byte form. It *is*
  the value's name; two spellings of one value have one name.
- **Act** — one lawful sentence of the kernel language. There are eight
  verbs and no ninth: `declare`, `resolve`, `emit`, `join`, `fold`,
  `decide`, `trigger`, `spawn`.
- **The door** (`admit`) — the one place judgment happens. A candidate
  act goes in; either an admitted act comes out, or a taught refusal
  does — reason, the law it defends, the legal next move, and whether
  that move is machine-applicable.
- **Fold** — the one read of changing state: a declared reduction over
  a lane, pinned to an **anchor** (a position in one partition of one
  lane). A folded answer is never wrong later; it is only earlier.
- **Resolve** — the read of an unchanging value: a digest in, its value
  out, re-derived and re-hashed on read. No anchor exists to pass.
- **Hole** — a declared parameter of a program: a named, typed slot
  that is not yet filled.
- **Provision** — the act of filling a hole, recorded as a positioned
  fact rather than as an overwrite.
- **Corpus** — the estate's one grammar stated as data: a line-per-record
  file the model emits and every projection is generated from.
- **Projection** — a surface generated from the corpus: the TypeScript
  types, the tool schemas, the prose page. A hand-written twin of a
  projection is a defect, not a style choice.
- **Register** — one *concretization* of an abstract statement: the same
  datum rendered in plain words, or in algebra, or (proposed here) in a
  signature notation. Registers are renderings of one datum, never two
  texts that happen to agree.
- **Program declaration** — a DAG of named generator applications
  written as one canonical value. Its digest commits the whole graph.

Two standing laws govern everything below and are stated once so they
need not be re-argued in each section.

> **One door.** All judgment routes through kernel admission. A private
> validator anywhere is a second door.

> **Served equals derived.** Rendered surfaces are generated from
> declared sources and byte-compared. Hand-authored twins are refused.

**How to read.** §1 is the prose parse half. §2 is the DAG as an AST.
§3 is the dependency/environment plane that joins it. §4 is the TS
projection the UI consumes. §5 is the notation register. §6 is the
grill sheet, which is the record's spine — one decision per row,
recommended option first with its price. §7 pre-registers the law
candidates. §8 states the bounds.

**The honesty convention.** Every section opens with a **Ground**
block: what exists in the model, the corpus, or the shipped surfaces
today, versus what would be new. Facts in a Ground block were read
first-hand at the branch point. Everything outside a Ground block is
proposal.

---

## 1. The prose parse half

### 1.0 The law, stated before the design

**Prose-parse emits candidate acts. Judgment stays with the door.**

A parser answers one question — *what candidate does this sentence
denote?* — and hands the answer on. It never answers *may this
happen?* The pipeline is four steps and there is no fifth:

```
sentence  →  parse  →  candidate act  →  admit  →  admitted act
                                              ↘   taught refusal
```

**The alternative is refused, by name.** A *prose validator* — a
component that reads a sentence and reports whether it describes a
lawful act — is refused on the one-door law. The reason is mechanical,
not stylistic: to answer that question the validator must know the
laws, and the laws known in two places are two doors. Two conforming
doors that teach different repairs is the documented confusion class
the estate already fenced when it ruled the refusal-priority order a
contract. A parser that refuses a *sentence* refuses it on syntax —
*this is not a sentence of the register* — never on a law. The
distinction is not a nicety; it is the whole of §1's claim to
lawfulness, and CANDIDATE PR-3 in §7 states it as a checkable property
rather than an intention.

### 1.1 Ground — what exists today

| Fact | Where it stands |
| --- | --- |
| The render half exists, three ways | a reference prose sketch beside the model, labeled as the sketch generation owes; a generated prose page rendered from the corpus; the corpus itself as the one grammar-as-data |
| The generated page is walled | it regenerates byte-identically from the corpus, and the check is in the fast battery |
| Determinism is already a stated prose property | hard breaks only, never reflow; minimal decimal with no grouping separators, because a separator imports a locale and locale is the ambient input the language refuses |
| A round trip of exactly the wanted shape is already **proven** — one register over | the program declaration's canonical encoding: `decode(encode(d)) = d`, proven in the model, with the committed vectors as its corpus |
| The registers are named and their obligations distinguished | performative (teaches by enacting), descriptive (total, derivable, never false), law-and-repair (speaks at the moment of refusal) |
| The failure mode is on the record | finding N-1: a generic plain-word template rendered a shard-merge as a join and said something false; the fix was one phrasing datum per operator, and the finding was made by *running* the renderer |

**What would be new: everything on the prose side of the arrow.** No
parser exists, in any language, for any register. No grammar formalism
is chosen. And the load-bearing gap, which the grill should see first:
**the sentence register is not data yet.** The page's sentence forms
live in printer code. A parser generated from the register needs the
register as corpus rows; a parser written against the printer's current
output is a hand twin of the grammar, which is the defect class.

### 1.2 Why the inverse is derivable at all — determinism, and the CNL frame

The render half is a *total function* from one datum to bytes, with no
reflow, no locale, no clock, and a fixed sentence form per production.
That is precisely a **controlled natural language** (CNL): a designed
subset of English with a formal grammar, English-shaped and
unambiguously machine-parseable. The inverse of a total, injective
linearization is a partial parse function defined exactly on that
linearization's image — so determinism is not a taste rule that
happens to help; it is the property that makes the inverse *exist*.

Three things the outside record supplies, each already gathered in the
projection survey:

- **The architecture has thirty years of prior art.** One abstract
  syntax with many concrete syntaxes, bidirectional — strings parse to
  trees, trees linearize to strings — with natural and formal languages
  as peer concrete syntaxes. The discipline that keeps it sound is the
  estate's own: concrete syntaxes must be *linearizations of the one
  tree*, never parallel authored artifacts.
- **The direction the estate already has is the cheap half.** The
  survey said so plainly: linearization is cheap, bidirectionality is
  expensive. This record's whole subject is the expensive half, and the
  record should not pretend otherwise.
- **The writability trap is measured and real.** CNLs are far easier to
  *read* than to *write*; human authors struggle to stay inside the
  fence, and tool support is what made the canonical CNL usable at all.
  Bearing: prose-parse is for agents and tooling authoring inside the
  canonical register, and for round-trip testing. Humans get the render
  half. Grill row PB-6 prices the alternative.

### 1.3 The round-trip laws, as candidate theorems

Two directions, and they are not the same claim.

**CANDIDATE PR-1 — prose is lossless (parse ∘ render = identity).** For
every act `a` in the modeled domain, `parse(render(a)) = some a`. This
is exactly the shape already proven for the canonical byte register,
which is the strongest argument that it is reachable: the model
carries a decode for a written form and proves it inverts the encode.

*Where it can hold:* over the **descriptive** register, which is a fold
over the constructor and its fields and says nothing the shape does not
already carry — so it cannot lose what it never invented.

*Where it cannot:* over the **performative** register, which carries a
reviewed phrasing datum per production. The phrasing is not recoverable
from the datum unless phrasing is injective per production, which is a
design cost and a law of its own. And over the **law-and-repair**
register, which speaks *about a refusal*, not about an act — there is
no act on the other side to recover.

*The quiet killer:* PR-1 cannot recover what the register does not
print. A truncated digest is lossy. The reader's rule — say the number
plainly, minimal decimal, no separators, no abbreviation — is therefore
load-bearing for parse, not only for taste.

**CANDIDATE PR-2 — the register is unambiguous (render ∘ parse =
identity on the canonical image).** For every sentence `s` with
`parse(s) = some a`, `render(a) = s`. This is the direction that prices
the register's *generosity*: every synonym, optional clause, or
whitespace freedom granted to a writer costs PR-2 directly. A register
that accepts more than it emits cannot satisfy it, and a register that
accepts exactly what it emits is one an agent will find rigid. That
tension is grill row PB-5 and it is a genuine ruling, not a detail.

### 1.4 What a parse refusal is, and what it is not

A sentence outside the register must be refused, and the refusal should
teach in the estate's shape — reason, law, repair, applicability. But
the *law* a parse refusal defends is a grammar law, not a kernel law,
and rendering a syntax error in the door's refusal vocabulary would say
that a malformed sentence violated a law of the algebra. It did not.

The precedent for the shape is already ruled: door-completeness reasons
are kept distinct from closure-law reasons — distinct catalogs, one
table, each row labeled with which catalog it belongs to. Prose-parse
reasons would be a third catalog under the same discipline. Grill row
PB-3.

---

## 2. The DAG AST

### 2.0 The honest headline

**The DAG is already an AST.** A program declaration is a list of named
generator applications with an explicit consumption edge set; that is a
syntax tree of the meta-language, written down, canonically encoded,
and content-addressed. The genuinely new thing this record proposes is
**not** an AST. It is (a) promoting that AST to a *language with
registers* — so a program can be rendered and (grill permitting) parsed
in prose and in notation the way a kernel act can — and (b) giving a
consumer a traversal and selection surface over it.

Saying this plainly is the section's main service to the grill. A
record that announced "a Lean DAG AST" as new work would be asking the
operator to fund something that mostly exists.

### 2.1 Ground — what exists today

| Fact | Standing |
| --- | --- |
| The program declaration form | four members: `nodes` (applications, newest first), `edges` (each consumption, consumer → consumed), `holes` (declared parameters, ascending by name), `lineage` (what this descends from) |
| The argument grammar | four reference forms and no fifth — `digest` (outside, branded by kind), `local` (a prior node: a consumption, puts an edge), `hole` (a parameter: a requirement, puts no edge), `literal` (an identity label). **No closure form**, because a function value has no canonical bytes and so nothing can reference it |
| The Lean carrier | a declaration structure with canonical encode, a decode, erasure to kernel program nodes, and an admissibility check |
| Proven about it | encode/decode round-trips; the consumption edge set equals exactly the uses the erasure implies; admissibility is sound against the kernel's own admission; every committed vector erases to a program the kernel admits |
| Well-foundedness | the pin order: a node may consume only names standing after it, and the kernel's pin law is proven well-founded by rank embedding — inherited, not re-argued |
| The corpus group | the program record group, carrying four committed vectors (a ground two-node program, a holey one, its filled twin, and a distill-shaped four-node chain) |
| The prose rendering | the generated page already renders program declarations: a count line, a node list with each wired argument named by the model's own field names, the declared parameters, and the canonical bytes as identity |
| Its standing fence, already printed on the page | *a declaration is not a run* — the vectors record what a program **is**, never what happened when one was executed |

**What would be new:** a register datum for the DAG (so that a rendering
is generated rather than written); the composition described in §3; a
traversal/selection surface for a consumer; and — if the grill allows
it — a parse direction.

### 2.2 Why authoring stays linear

Three convergent external facts, gathered in the projection survey and
not re-litigated here: node-and-wire surfaces demo beautifully and
degrade into spaghetti past small programs (the visual-language field's
own name for its central failure); LLMs emit graphs poorly but code
well, with programmatic tool calling beating JSON tool calling by a
widening margin as chains deepen; and for *reading*, graph-encoding
choice alone swings model accuracy enormously, with incident-style
encodings winning most tasks.

The lean those three produce is one posture: **the DAG is a read and
audit projection; authoring stays on the linear grammar.** The
declaration's `edges` and per-node uses lists already *are* an incident
encoding, so the cheap side of the reading evidence is the side the
estate is already on. The columnar spike reached the same posture from
the other end and said so in its own bounds: no write path — every
control on it is a read.

### 2.3 Node identity, and law 10

A node's name inside a declaration is a declaration-scoped natural. It
is meaningful only within the one canonical value whose digest commits
it. Rendering that bare number outward as a node's identity would make
it an ambient reference — the class law 10 refuses, alongside paths.

**CANDIDATE PR-4 — digest-only node identity.** Every outward-rendered
node identity is a digest or a value derived from digests (the
enclosing declaration's digest together with the local name). No bare
local name, no path, and no minted identifier crosses the projection
boundary.

Its price is real and the grill should see it: identity is then stable
only *per declaration*. Two declarations that share a node shape have
different node identities, so any "the same node, across versions"
affordance a UI wants must be built from `lineage`, not from identity.
The alternatives are both already refused elsewhere — a bare local name
is ambient; a UI-minted id is a minted identifier. Grill row DA-2.

---

## 3. The dependency and environment plane

The operator's phrase was *"dependencies or environments or whatever we
called them."* The estate has ratified names for all three, and this
section states them so a ruling can be stated as a ruling.

### 3.0 The canonical vocabulary — three sentences

> **Requirements are unfilled holes.** A program's requirement set is
> its unfilled parameters. Requirements union across composition;
> filling a parameter removes exactly what it filled; a program with
> nothing unfilled is closed.

> **Environments are directories.** A provision is a positioned fact
> that accumulates rather than overwrites, and the value a name has is
> the provision standing at the greatest position at or before the
> anchor. Nothing is deleted; a later provision shadows an earlier one.

> **Paths are iterated resolution.** A path is a list of names resolved
> from an explicitly named root digest, hop by hop, nearest-wins. A
> rootless or relative path is an ambient input and belongs on the
> closure list beside the clock.

The three are one algebra seen at three grains, and the estate's Effect
correspondence is the reason they are worth stating together: the type
channel that carries a program's requirements is the unfilled-hole set
read at the type level; the environment is the valuation the provision
fold produces; and the exclusion rule — provide removes what it
provides — is a theorem, not a convention.

**Naming discipline, stated once.** "Dependency," "environment," and
"context" are familiar words that each map to one of the three. Using
them loosely imports semantics the estate does not have (a
reference-keyed memo, a scope that pops, a deletion). Grill row DE-1
asks whether the three sentences are the canonical names outward and
the familiar words are glosses that must say which they mean.

### 3.1 Ground — what exists today

| Fact | Standing |
| --- | --- |
| Holes in the declaration form | each carries a name and a schema digest; the corpus's holey vector carries one |
| Hole **stages** | five, in rising rank: opened, filled, disputed, decided, sealed. Ranks 0–4, read only in the *reached-at-least* direction; generated into the TypeScript tables as a closed vocabulary with its rank map |
| Stages are trigger material | one of the five closed monotone trigger productions is "a hole reaches a stage"; a rank past the closed table has no reading and refuses, with an executed control behind that refusal |
| The requirement algebra | filling at a hole is provision; the exclusion law — requirements after a fill are requirements minus what was filled — is **proven** |
| The environment algebra | newest-wins overlay lookup, append-as-union, disjoint-order-freedom (with a committed drift control showing the disjointness premise is load-bearing), and the collapse theorem: the order-carrying fold **is** the positioned greatest-position read — all proven |
| Where the price sits | authoritative rebinding across writers is the directory's fenced decision, exactly where the estate already put it |

### 3.2 What the DAG grows, and the sort split that must come with it

The composition the commission asks for is: **program nodes + pin edges
+ hole nodes with their stages + environment references resolving as
directory reads**, in one meta-language grammar.

Most of that is re-projection. One part of it is a genuine design
question, and it is the sharpest finding in this record:

> **A hole is declaration content. A hole's stage is anchored fold
> state.** The declaration says a parameter exists and names its
> schema. Whether that parameter has *reached* the stage `filled` is a
> fact about the world at an anchor, read by a fold, true at that
> anchor and never wrong later.

The two age completely differently — one cannot change at all, the
other only rises — and the estate already has the law that keeps them
apart on a surface: resolve-class data carries no anchor and no
staleness affordance; fold-class data carries an anchor and its lag. An
AST node that renders a hole with a stage badge on it is rendering two
sorts as one node, which is the category error that split exists to
prevent.

**CANDIDATE PR-6 — the sort split rides the AST.** Every node of the
DAG AST is *resolve-class* (declaration content, anchor-free,
cacheable forever) or *fold-class* (anchored state about declaration
content); no node is both, and only fold-class nodes carry an anchor.

Its price: hole stage, requirement status, and every execution fact
become their own fold-class nodes rather than fields on a declaration
node. More nodes, more folds, more anchors on screen. The cheap
alternative — stage as a field — renders faster and says something
false about the sort. Grill rows DA-3 and DE-2.

The same reasoning falls on environment references. An environment read
is a fold at an anchor; a declaration is anchor-free. So a declaration
may name a **root digest**, and its nodes may *read* from that root at
anchors — but a field on the declaration form saying "this program runs
in environment E" would put an anchored read inside anchor-free content
and re-open the ambient-root fence in the same move. Grill row DE-3.

### 3.3 Own it, or reference it?

The composition question the grill must settle first: does the
meta-language grammar **own** holes, stages, and environments, or does
it **reference** the kernel's?

Referencing is recommended, and the reason is law 1 rather than
economy. The kernel corpus already defines a hole, a stage, and the
provision algebra. A meta-language that defined its own would be a
second definition of a corpus concept, which is a defect and not a
style choice. The price of referencing is a real constraint, stated
honestly: **the meta-language cannot say anything about a hole that the
kernel's forms cannot carry** — which is exactly why stage cannot be a
field, and why "grow the kernel's form first" is the lawful route if
the operator wants it to be one. Grill row DA-1.

---

## 4. The TypeScript projection for the UI

### 4.0 The boundary, stated as a law candidate

> **CANDIDATE PR-5 — the generated-AST boundary.** The TypeScript DAG
> AST — its types, its schemas, its argument grammar, its per-generator
> shapes — is a **generated projection**, emitted through the printer
> family from the model and byte-compared against its committed bytes.
> Hand-written TypeScript in this lane is **UI consumption only**: it
> may traverse, lay out, select, and render, and it may declare no type
> that names a corpus concept.

The reason this needs to be a law and not an intention: a hand-written
TS twin of the AST is the exact defect class the estate walled this
same night. The estate's answer to it is not review vigilance; it is a
printer family that emits the target language from a model, so the twin
cannot be written in the first place.

### 4.1 Ground — what exists today

| Fact | Standing |
| --- | --- |
| The printer family landed | the TypeScript target grammar is embedded in the model as data at exactly the node set the emitted surfaces use — 45 structural kinds and 44 terminals, measured with the TypeScript compiler over the committed files rather than guessed — with one printer over it that knows nothing about kernels |
| It generalizes across targets | a Go target grammar, printer, and table generator sit beside it, same shape — evidence that the family is a family, not a one-off |
| Four TypeScript surfaces are generated today | the schemas, the tables, the builder, and the refusal kinds — each with byte-identical regeneration and a check in the battery |
| The DAG AST types are already among them | the generated builder carries the four-form argument grammar (`digest`, `literal`, `hole`, `local`-as-handle), the branded handle type, the per-generator argument interfaces, the generator vocabulary, and the `$`-constructor interface |
| The layout engine is a measured table, not an algorithm | per-site break predicates, four distinct doc-comment policies, a per-file trailing-newline rule — the parity facts a printer must inherit rather than clean up |

**What would be new:** AST types for whatever §2 and §3 add beyond the
current builder (any register datum, any fold-class node shape); the
consumption layer itself; and an audit of what is hand-written today.

**One honest flag, stated as a question and not as a finding.** The
hand-written program module beside the generated builder exports types
that *name* corpus concepts — a hole declaration, a program
specification, a requirements type. Whether those are lawful
consumption-side shapes, or staged debt owed a waiver, was not
established by this record and should not be asserted by it. Grill row
TS-2 asks for the audit rather than pronouncing the verdict.

### 4.2 The seam — what the UI needs that is not grammar

Everything on this list is coalgebra-side: a consumer's own state and
its own rendering. **None of it is grammar, and none of it belongs in
the corpus.**

| The UI needs | Why it is not grammar | Its constraint |
| --- | --- | --- |
| **Layout** — node positions, column order, wrapping, density | The spike's own bound: the algebra constrains semantics and the page still needed ordinary design judgment everywhere else | Taste, openly. It may not enter the corpus (grill row DA-4) |
| **Traversal** — walk order, expand/collapse, focus, sub-graph encapsulation | A walk is a consumer's path through committed content | Sub-graph encapsulation is the field's named anti-spaghetti device, and the kernel already has it: a child program by digest |
| **Selection state** — what is selected, hovered, multi-selected | Ephemeral consumer state, anchored nowhere, meaning nothing | Never persisted as a fact; never rendered as though it were one |
| **The view declaration** | A view is a declared fold read at an anchor under a writ — the data-flow half of the frontier note, which **stands** | A screen is citable and diffable by digest, so the UI owes a view declaration per screen |
| **Anchor and lag chrome** | Staleness is `head − anchor`, in positions, exact, and needs no clock | Only on fold-class nodes (PR-6). A lag chip on resolve-class content is a category error visible to the naked eye |
| **Refusal rendering** | Refusals are content, not error handling | Machine-applicable rows offer a mechanical repair; advisory rows offer *the ask*. There is no "unknown error" state to design, because refusal parity is total |

**The refuted lane is respected, explicitly.** The visual half of the
frontier note and its dashboard mock were refuted as generic chrome —
not a composition of the estate's primitives — and the visual register
is being re-derived as a third concretization under the register
discipline: a visual-denotation map generated from rule data,
researched before any screen ships. **This record therefore proposes no
marks, no visual vocabulary, and no screen.** The table above is the
data-flow half only, which is the half that survived. Grill row TS-4
keeps it that way on purpose.

**What generation owes on this seam, from the spike's own accounting.**
The columnar spike's engine was already generic; its only hand-written
parts were the column declaration lists and the law-strip prose — and
those are exactly the parts a real implementation must emit: column set
and types from the declared reduction's output shape, aggregate
offerings and their delivery badges from the algebra catalog's rung
ladder, the anchor header from the fold's own anchor argument, and the
captions from the same rule data that generates the prose register. The
spike said so itself, in its own footer, and called its hand-derived
page the drift class it belonged to.

### 4.3 The asymmetry, stated once

The UI **reads** the DAG. Authoring stays linear. And an edit is not an
edit: revision is a successor declaration that pins its predecessor, so
there is no *save* button, no *delete*, and no *refresh* — the absent
buttons are the language showing through the chrome.

---

## 5. The notation register

### 5.0 The standing ruling this section lives under

The register question is not open; it was ruled. Stated in the ruling's
own terms:

- Notation lives in **three lawful places and no fourth**: the type and
  doc layer (a generator's documentation opens with its algebraic
  sentence); the prose projection's **second register** (plain-word and
  algebraic concretizations generated from **one rule datum**, with
  refusals teaching in both); and — **as an experiment only** —
  generated bracket-property aliases.
- **Bare math-symbol identifiers are impossible in the target language
  and refused by the plain-words ruling regardless.**
- Whether symbol surfaces help or hurt an agent's population of the
  wire is **unknown**; the evaluation harness gains a notation arm —
  same tasks, three surfaces, lawfulness and wrong-slot rates —
  **before any alias ships**.
- Two alternatives were refused outright: notation in identifiers, and
  **a parsed math DSL string surface** — refused as a second assembler.

That last refusal bears directly on this section, and the record states
it rather than routing around it: **a parse direction for the notation
is not a fresh question.** It is one the standing ruling already leaned
against. Grill row NR-2 therefore recommends render-only *because of
that ruling*, and marks the parse arm as something that requires the
operator to revisit a refusal, not merely to approve a proposal.

### 5.1 Ground — what exists today

Nothing. There is no notation register in the model, the corpus, or any
generated surface. The two-register discipline exists as a ruling and
as a scratch exemplar; the plain-word register is what ships. The
sketch below is a sketch on this page and has no datum behind it.

What *does* exist and constrains the sketch: the printers' doc policies
are measured and committed, including that non-ASCII survives verbatim
on the TypeScript path while the prose path folds to ASCII and refuses
unnamed code points. A symbol choice is therefore a printer-policy
choice with committed bytes behind it, not a typographic preference.
Grill row NR-5.

### 5.2 The sketch — a signature register for the meta-language

The shape: a **type-signature line** naming the program and its
parameters, then a **let-block** of node applications, then the node
the program yields. Hole references are marked. Composition reads in
the declaration's own newest-first order, which is a small piece of
luck worth naming — the order the model already stores nodes in is the
order a reader of a functional signature expects.

Every sentence below travels with its plain-word register beside it,
because that is the discipline, not a courtesy.

**(a) A closed program — no parameters.**

```
ground-two-node :: Program
ground-two-node =
  let n1 = declare {}
      n2 = emit { body = n1 }
   in n2
```

> Two nodes and no declared parameters: a christening, and a deposition
> that carries it. The deposition consumes the christening, which is
> the one consumption edge.

**(b) An open program — a parameter, visible in the signature.**

```
holey :: Program { ?7 :: Schema 88 }
holey =
  let n1 = declare { value = ?7, writ = policy 4 }
      n2 = emit { lane = lane 1, body = n1 }
   in n2
```

> One declared parameter — parameter seven, of the schema named
> eighty-eight. A parameter is a requirement, not a consumption: it
> puts no edge in the graph. Until it is filled the program is open.

**(c) Filling — the one example sentence with a theorem behind it.**

```
holey ▷ { ?7 = literal 42 } :: Program { }
```

> Filling parameter seven with the identity label forty-two leaves a
> program with no parameters left. The requirement set shrinks by
> exactly what was filled — which is proven, not asserted, and is the
> same statement as the type-level exclusion rule the Effect
> correspondence names.

**(d) An environment read — the directory, in signature form.**

```
(root @ p) ! "ops" :: Maybe Digest
```

> The value a name has in an environment is the provision standing at
> the greatest position at or before the anchor. A later provision
> shadows an earlier one; nothing is deleted; and the root is named
> explicitly, because a rootless path is an ambient input.

**(e) A stage, for completeness — and a warning.**

```
?7 ⊒ filled
```

> Parameter seven has reached at least the stage *filled*. Stages only
> rise: opened, filled, disputed, decided, sealed. **This sentence is
> fold-class**: it is true at an anchor, and a rendering of it that
> carries no anchor is claiming something the algebra cannot support.
> The notation must not be allowed to flatten the sort split §3.2
> draws.

### 5.3 What the register must inherit

- **One datum, two renderings.** The notation and the plain words are
  concretizations of one rule datum, generated together. Two texts that
  happen to agree are a consensus, not a fact.
- **N-1 rides this register too.** A generic template rendered a false
  plain-word sentence once already; the repair was one phrasing datum
  per operator, and a missing datum is a shape-check failure rather
  than a silent default. The notation register inherits that
  obligation, per production, per register.
- **Templates may render structure; they may not render meaning.**
  Where the notation must carry meaning, it quotes a reviewed datum.
- **The eval arm gates anything deeper.** Rendering is a projection and
  ships as one. An alias surface, or any claim that notation helps an
  agent, waits on the harness arm the ruling already commissioned.

---

## 6. The grill sheet

One decision per row. **Recommended option first, with its price.**
Alternatives priced beside it. Twenty-seven rows.

### 6.1 The prose parse half

| # | Decision | Recommended, and its price | Alternatives, priced |
| --- | --- | --- | --- |
| PB-1 | Grammar formalism for the register | **State the register as corpus data** (a sentence form per production) and generate the parser from it — one grammar, two directions. *Price:* the register must be lifted out of printer code into corpus rows before anything parses; that is the real cost of the whole lane | (a) hand-written parser against the printer's current output — cheapest, and a hand twin of the grammar by construction; (b) adopt a CNL toolchain wholesale — buys bidirectionality and thirty years of prior art, costs a foreign toolchain and a second language in the estate; (c) parse only the descriptive skeleton by table — narrow, cheap, covers only the skeleton |
| PB-2 | Where prose-parse's output lands | **A candidate act into the existing door. No new type.** *Price:* none — this is the one-door law, not a choice | A prose-specific verdict type: refused on law 2 |
| PB-3 | What refuses an out-of-register sentence, in whose vocabulary | **A parse-refusal catalog distinct from the door's reasons**, same reason·law·repair shape, labeled by catalog — the precedent that keeps door-completeness reasons distinct from closure-law reasons. *Price:* a third catalog to keep at parity | Reuse the door's reasons: cheaper, and says a syntax error violated a law of the algebra — false |
| PB-4 | Which registers are parseable | **Descriptive only.** *Price:* the performative register — the one that teaches best — stays render-only | Performative too: requires phrasing to be injective per production, which is a design cost and a candidate law of its own; law-and-repair is not parseable in principle (no act on the other side) |
| PB-5 | Which round trip is a gate | **Parse ∘ render = identity, gate-executed over every corpus sentence** — the shape already proven one register over. *Price:* the register must be total over the corpus | Also render ∘ parse = identity (unambiguity): stronger, and it prices every degree of freedom the register would grant a writer — accept-more-than-you-emit fails it by construction |
| PB-6 | Who may write prose in | **Agents and tooling, inside the canonical register.** *Price:* gives up "write English at the estate" | Human free-writing with a repair loop: the measured CNL writability trap says tool support is what made this workable at all |
| PB-7 | Where the parser lives | **Beside the printers, generated from the same rule data**, with the TypeScript parser a generated projection. *Price:* model-side parsing work and a second consumer of the printer family | (a) hand-written in the runtime package — fast, twin risk; (b) TypeScript only — loses the model as referee |

### 6.2 The DAG AST

| # | Decision | Recommended, and its price | Alternatives, priced |
| --- | --- | --- | --- |
| DA-1 | Does the meta-language **own** holes, stages, and environments, or **reference** the kernel's? | **Reference.** *Price:* the meta-language can say nothing about a hole the kernel's forms cannot carry — in particular, stage cannot be a declaration field | Own them: a second definition of a corpus concept — a law 1 defect unless the kernel's forms grow first, which is the lawful route if the operator wants one |
| DA-2 | Node identity, outward | **Digest or digest-derived** (enclosing declaration digest + local name). *Price:* identity is stable only per declaration, so "the same node across versions" must be built from lineage | (a) bare local name: ambient, refused by law 10; (b) a UI-minted id: a minted identifier, refused by the closure list |
| DA-3 | Sort split inside the AST | **Every node is resolve-class or fold-class, never both; only fold-class carries an anchor.** *Price:* more nodes, more folds, more anchors on screen | Stage and status as fields on the declaration node: renders faster, says something false about the sort |
| DA-4 | Is the DAG a new corpus group or a register over the existing one? | **A register over the existing program group.** *Price:* nothing renders until a register datum exists | A DAG-specific corpus group carrying layout hints: refused — that is taste entering the corpus |
| DA-5 | Authoring direction | **Linear authoring stays; the DAG is read and audit only.** *Price:* no visual authoring without a fresh ruling | Visual authoring for humans: the kernel's bones already meet the field's stated requirements (typed ports are branded sorts, closed vocabulary is eight generators, encapsulation is a child program by digest) — but the scaling-up problem is the field's own name for its central failure |
| DA-6 | Text encoding when the DAG is rendered **to** an agent | **Incident-style per-node lines** — which the edges and uses lists already are. *Price:* none today | Adjacency or edge-soup: the graph-encoding evidence swings widely on this choice, and this is the cheap side of it |

### 6.3 The dependency and environment plane

| # | Decision | Recommended, and its price | Alternatives, priced |
| --- | --- | --- | --- |
| DE-1 | Vocabulary pin | **The three sentences are the canonical names outward**; "dependency", "environment", and "context" are glosses that must each say which they mean. *Price:* familiar words lose their free ride | Let the borrowed words travel outward: familiar to readers, and imports semantics the estate does not have — a reference-keyed memo, a scope that pops, a deletion |
| DE-2 | Does the declaration form grow a stage field? | **No — stage is anchored fold state.** *Price:* a stage badge on a surface carries an anchor and a lag, which is more chrome and more honest | Stage in the declaration: one cheap render, one false sort, and the trigger production that reads stages would then read declaration content |
| DE-3 | Environment references inside a declaration | **Refuse.** A declaration may name a root digest; its nodes read at anchors. *Price:* no "this program runs in environment E" field; environment enters at execution | A declared environment reference: convenient, smuggles an anchored read into anchor-free content, and re-opens the ambient-root fence |
| DE-4 | Are requirements rendered as a signature? | **Yes — unfilled holes are the signature's parameter list.** *Price:* none beyond the register itself | Requirements as a separate panel or table: loses the one place a reader looks, and separates a program from what it needs |

### 6.4 The TypeScript projection

| # | Decision | Recommended, and its price | Alternatives, priced |
| --- | --- | --- | --- |
| TS-1 | The boundary | **Generated AST types through the printer family, byte-walled; hand-written TypeScript is consumption only** (CANDIDATE PR-5). *Price:* every AST type change is a model change plus a regeneration, and the UI may not add a field for its own convenience | A hand-written UI-facing AST mapped from the generated one: the twin class, walled against this same night |
| TS-2 | The module that already exists | **Audit the hand-written program module against the boundary**, then either generate its corpus-concept types or waive them with a citation. *Price:* an audit, and possibly a waiver row | Leave as is: a standing law 1 question with no answer on the record |
| TS-3 | What the UI may add | **Layout, traversal, selection, and a view declaration — coalgebra-side, none of it grammar.** *Price:* the UI owes a declared view per screen, so screens become citable and diffable by digest | Unconstrained UI state: loses citability, which is the obligation the view law exists to carry |
| TS-4 | Marks and visual vocabulary | **Not in this record** — the visual register is re-derived as a third concretization under the register discipline, from a denotation map generated from rule data, researched before any screen ships. *Price:* no screen ships from this record | Sketch marks now: exactly what was refuted |

### 6.5 The notation register

| # | Decision | Recommended, and its price | Alternatives, priced |
| --- | --- | --- | --- |
| NR-1 | Formalism | **The signature register sketched in §5.2** — signature line, let-block of node applications, marked hole references, newest-first order read as composition. *Price:* one phrasing datum per production per register, forever, and a new register to keep at parity | (a) a pure-symbol algebra register: denser, and the eval arm is the only honest way to learn whether it helps; (b) no notation at all: cheapest — and the operator asked for it |
| NR-2 | Render-only, or parse too? | **Render-only.** *Price:* the notation cannot be authored in. *The reason, stated honestly:* a parsed math surface was already refused as a second assembler, so a parse arm asks the operator to revisit a refusal, not to approve a proposal | Parse under the same one-door law as prose-parse: coherent in itself, doubles the parse obligation, and re-opens a standing refusal |
| NR-3 | Where notation may appear | **The three ruled homes and no fourth** — doc and type layer, the prose projection's second register, and generated aliases as an experiment behind the eval arm. *Price:* no notation in identifiers, ever | None coherent with the plain-words ruling |
| NR-4 | Does notation always travel with plain words? | **Yes, generated from one datum.** *Price:* two renderings per production, forever | Notation alone on "expert" surfaces: this is how N-1 happens — a register with no companion has nothing checking its claims |
| NR-5 | Which symbols | **ASCII-first, with each non-ASCII symbol admitted by name.** The printers already carry the policy — verbatim on the TypeScript path, ASCII fold on the prose path, unnamed code points refused. *Price:* a per-symbol ruling | Free Unicode: breaks the ASCII fold on the prose path and turns a printer policy into a taste argument |

### 6.6 Sequencing

| # | Decision | Recommended, and its price | Alternatives, priced |
| --- | --- | --- | --- |
| SQ-1 | What ships when | **(1)** lift the sentence register into corpus data — it unblocks everything, notation included; **(2)** the notation register as a second concretization over that datum — cheap once (1) exists, and the operator's fun lands early; **(3)** the DAG read/audit register with the sort split; **(4)** prose-parse against the register; **(5)** UI consumption. *Price:* the parse half — the thing the commission names first — lands fourth | (a) parse first: dramatic, and parses a register that is not data yet, so the parser is a hand twin by construction; (b) UI first: the order that was already refuted |

---

## 7. Pre-registered law candidates

Every statement here is a **CANDIDATE**. None is claimed, none is
proven, and none may be cited as though it were.

| # | Candidate, stated | Where it would be proven | What would falsify it |
| --- | --- | --- | --- |
| **PR-1** | *Prose is lossless.* For every act `a` in the modeled domain, `parse(render(a)) = some a`, over the descriptive register | The model, as the canonical-byte round trip already is; gate-executed over every corpus sentence | One corpus sentence that parses to a different act, or to nothing. A truncated or abbreviated rendering falsifies it by construction |
| **PR-2** | *The register is unambiguous.* For every sentence `s` with `parse(s) = some a`, `render(a) = s` | Same gate, second arm | Any accepted spelling the renderer does not emit — every synonym or optional clause is a counterexample |
| **PR-3** | *One door survives the parser.* The set of admitted acts is unchanged by the parser's existence: for every sentence, prose-parse either refuses on syntax or yields a candidate, and never admits or refuses on a law | A differential control: candidates reaching the door by parse and by construction receive identical verdicts, refusals included | One sentence the parser rejects that the door would have admitted, or accepts that the door would have refused for a reason the parser reproduced |
| **PR-4** | *Digest-only node identity.* Every outward-rendered node identity is a digest or a digest-derived value; no local name, path, or minted identifier crosses the projection boundary | The tracking-artifact clause extended over the DAG register's committed bytes | One rendered surface carrying a bare local name or a path as an identity |
| **PR-5** | *The generated-AST boundary.* The TypeScript DAG AST regenerates byte-identically from the model, and the hand-written module declares no type naming a corpus concept | A byte-identical regeneration check plus the type-universe walk, both already the estate's shape | A committed AST type the generator does not produce; a hand-written type naming a corpus concept without a waiver |
| **PR-6** | *The sort split rides the AST.* Every AST node is resolve-class or fold-class, never both, and only fold-class nodes carry an anchor | A shape check over the register datum, with an executed control that plants a mixed node and must be refused | One node carrying both declaration content and anchored state |

Two of the six have a strong precedent and four do not, and the record
should not blur that. PR-1 is the shape already proven one register
over. PR-5 is the shape four generated surfaces already satisfy. PR-2,
PR-3, PR-4, and PR-6 are new statements about machinery that does not
exist.

---

## 8. Honest bounds

1. **Nothing here is built, and nothing here is data.** No model
   definition, no corpus row, no gate, no generated surface, no ticket.
   The record's only write is this file.
2. **The notation is a sketch on this page.** It has no rule datum
   behind it, it is not generated, and it should not be quoted as
   though the estate had a notation.
3. **The parse half is entirely unbuilt.** No formalism is chosen, no
   parser exists, and this record makes no estimate of the cost — the
   one cost it does name (the register must become data first) is
   structural, not sized.
4. **The refuted lane is respected.** No marks, no visual vocabulary,
   no screen, no dashboard. The frontier note's data-flow half is used;
   its visual half is not.
5. **The Ground blocks are first-hand; nothing else is.** Facts in a
   Ground block were read at the branch point in the model, the corpus,
   the generated surfaces, and the printer family. Every other
   statement is proposal, lean, or candidate, and is marked as such.
6. **No claim about agents is made.** Whether a notation register, a
   prose register, or a schema dump makes an agent act more lawfully is
   unmeasured, and the standing ruling already commissions the arm that
   would measure it. This record adds no evidence and takes no side.
7. **The one open verdict this record deliberately withholds.** The
   hand-written program module's corpus-concept types may be lawful
   consumption shapes or staged debt; the record flags the question and
   does not answer it, because answering it from a reading rather than
   an audit is how a wrong finding gets cited later as a fact.

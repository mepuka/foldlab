# Receipts: how programming languages actually get designed

> Provenance: delivered 2026-08-25 by a case-study child of the syntax-grammar-design reader,
> landing after its parent finished; persisted verbatim by the coordinator (the child wrote no
> files). Additive to syntax-grammar-design.md chapter 1. Every URL below was fetched in the
> child's session unless marked otherwise; PDFs were downloaded and text-extracted to confirm
> contents, not just HTTP status. No PDFs were saved to .reference/papers by this child.

## 1. Rust RFC process

**The repo** — https://github.com/rust-lang/rfcs — VERIFIED. README: the process "is intended
to provide a consistent and controlled path for changes to Rust." An RFC is required for "Any
semantic or syntactic change to the language that is not a bugfix." Process: fork → copy
template → PR → sub-team review → 10-day Final Comment Period → merge or close.

**Rendered book** — https://rust-lang.github.io/rfcs/ — VERIFIED. Numbering rule, verbatim:
"Don't assign an RFC number yet; This is going to be the PR number and we'll rename the file
accordingly if the RFC is accepted."

**The template** — https://github.com/rust-lang/rfcs/blob/master/0000-template.md (raw:
https://raw.githubusercontent.com/rust-lang/rfcs/master/0000-template.md) — VERIFIED, both.
All nine headings confirmed verbatim and in order:

1. Summary
2. Motivation
3. Guide-level explanation
4. Reference-level explanation
5. Drawbacks
6. Rationale and alternatives
7. Prior art
8. Unresolved questions
9. Future possibilities

Guiding questions, verbatim:
- **Guide-level explanation** — "Explaining the feature largely in terms of examples." Also
  "Introducing new named concepts"; "Explaining how Rust programmers should *think* about the
  feature"; "If applicable, provide sample error messages, deprecation warnings, or migration
  guidance."
- **Drawbacks** — "Why should we *not* do this?"
- **Rationale and alternatives** — "Why is this design the best in the space of possible
  designs? What other designs have been considered and what is the rationale for not choosing
  them? What is the impact of not doing this? Could this be done in a library or macro instead?"
- **Prior art** — "Does this feature exist in other programming languages and what experience
  have their community had?"
- **Unresolved questions** — "What parts of the design do you expect to resolve through the RFC
  process before this gets merged?"
- **Future possibilities** — "Think about what the natural extension and evolution of your
  proposal would be…"

### Recommended worked case study: RFC 2394, async/await

**RFC 2394 "async/await"** — https://rust-lang.github.io/rfcs/2394-async_await.html, raw at
https://raw.githubusercontent.com/rust-lang/rfcs/master/text/2394-async_await.md — VERIFIED
(both).

The strongest choice because **the RFC shipped with the syntax deliberately unresolved**, and
the precedence reasoning is on the page. Verbatim: "`await` has an interesting interaction with
`?`. It is very common to have a future which will evaluate to a `Result`, which the user will
then want to apply `?` to." The RFC lays out four options and refuses to pick:

1. "Require delimiters of some kind, maybe braces or parens or either, so that it will look
   more like how you expect — `await { future }?`" (called "rather noisy")
2. "Define the precedence as the obvious, if inconvenient precedence, requiring users to write
   `(await future)?`"
3. "Define the precedence as the inconvenient precedence"
4. "Introduce a special syntax to handle the multiple applications, such as `await? future`"

**The decision, one year later** — https://without.boats/blog/await-decision/ — VERIFIED.
Withoutboats, 6 May 2019, writing for the Rust lang team. Postfix `expression.await` won.
Verbatim: "The primary argument in favor of postfix was its better composability with methods
and the `?` operator." The author declares himself the dissenter: "I am the only member of the
language team that prefers a prefix syntax."

Supporting: **rust-lang/rust#57640 "Resolve `await` syntax"** —
https://github.com/rust-lang/rust/issues/57640 — VERIFIED (opened by cramertj, 15 Jan 2019;
labels A-async-await, T-lang). The precedence outcome is visible in **the Rust Reference** —
https://doc.rust-lang.org/reference/expressions.html — VERIFIED: `?` binds tighter than all
unary operators and looser than method calls / field access / indexing.

**Two backups, both verified:**
- **RFC 0243 "Trait-Based Exception Handling"** (the `?` operator) —
  https://rust-lang.github.io/rfcs/0243-trait-based-exception-handling.html and
  https://github.com/rust-lang/rfcs/blob/master/text/0243-trait-based-exception-handling.md.
  Verbatim: "The `?` operator has the same precedence as `.`" Enables `foo()?.bar()?.baz()`.
  Most of its explicit tension is keyword choice (six candidates: `try/catch`, `try/match`,
  `try/handle`, `catch/match`, `catch/handle`, bare `catch`), less parse ambiguity — which is
  why 2394 is the better case study.
- **RFC 2113 "dyn-trait-syntax"** — https://rust-lang.github.io/rfcs/2113-dyn-trait-syntax.html.
  Bare `Trait` as a type "makes traits and trait objects appear indistinguishable"; failures
  surfaced as misleading `Sized` errors. Good for the "syntax that parses fine but reads wrong"
  angle.

## 2. Go

**Proposal process** — https://github.com/golang/proposal — VERIFIED. GitHub issue → triage →
design doc if needed → accept/decline. Design docs live at `design/NNNN-shortname.md` where
NNNN is the issue number, reviewed through Gerrit.

**The design-doc template** — https://raw.githubusercontent.com/golang/proposal/master/design/TEMPLATE.md
— VERIFIED. Sections: Abstract, Background, Proposal, Rationale, Compatibility, Implementation,
Open issues. Much thinner than Rust's — no "prior art," no "guide-level explanation," no
"future possibilities."

### The syntax-ambiguity discussion

**Primary doc: the accepted Type Parameters Proposal** —
https://github.com/golang/proposal/blob/master/design/43651-type-parameters.md — VERIFIED
(raw markdown downloaded, 141 KB, grepped; quotes exact). Search the file for "Why not use the
syntax".

**"Why not use the syntax F\<T\> like C++ and Java?"** — verbatim:

> When parsing code within a function, such as `v := F<T>`, at the point of seeing the `<` it's
> ambiguous whether we are seeing a type instantiation or an expression using the `<` operator.
> This is very difficult to resolve without type information.
>
> For example, consider a statement like
>
> ```
> a, b = w < x, y > (z)
> ```
>
> Without type information, it is impossible to decide whether the right hand side of the
> assignment is a pair of expressions (`w < x` and `y > (z)`), or whether it is a generic
> function instantiation and call that returns two result values (`(w<x, y>)(z)`).
>
> It is a key design decision of Go that parsing be possible without type information, which
> seems impossible when using angle brackets for generics.

**"Why not use the syntax F(T)?"** — verbatim: "An earlier version of this design used that
syntax. It was workable but it introduced several parsing ambiguities." Three concrete
ambiguities given: `var f func(x(T))` (unnamed param of instantiated type `x(T)`, or param `x`
of parenthesized type `(T)`?); `[]T(v1)` vs `[]T(v2){}` (conversion or type literal?);
`interface { M(T) }` (method `M`, or embedded instantiated interface?). Conclusion: "These
ambiguities are solvable, by adding more parentheses, but awkward."

Also verbatim, on why type-parameter names can't be elided: "Unlike regular parameter lists, in
type parameter lists names are required for the type parameters. This avoids a syntactic
ambiguity, and, as it happens, there is no reason to ever omit the type parameter names."

**Griesemer's mailing-list post that drove the switch** —
https://groups.google.com/g/golang-nuts/c/7t-Q2vt60J8 ("Generics and parentheses", Robert
Griesemer, July 2020) — VERIFIED. Argues square brackets over parens because "the ambiguities
arising with parentheses do not arise with square brackets."

**The announcement of the switch** — https://groups.google.com/g/golang-nuts/c/iAD0NBz3DYw
(Ian Lance Taylor, 20 Aug 2020) — VERIFIED. Verbatim: "To avoid the ambiguity with array
declarations, we will require that all type parameters provide a constraint." That is the
`type Vector[T]` vs `[N]int` collision, resolved by making the constraint mandatory.

**Older draft (parenthesis era), for contrast** —
https://raw.githubusercontent.com/golang/proposal/7f0d01687e030f21e8bdc36dfd9d5aac3a6f4a71/design/go2draft-type-parameters.md
— VERIFIED (130 KB; same two "Why not…" sections in earlier form). Caution: the live
go.dev/design/go2draft-type-parameters now 302s to an empty Gitiles stub — cite the
pinned-commit raw URL instead.

### Go's grammar being simple / parseable without type info

- **Rob Pike, "Go at Google: Language Design in the Service of Software Engineering"** —
  https://go.dev/talks/2012/splash.article — VERIFIED. Verbatim: "the grammar is regular and
  therefore easy to parse (mostly; there are a couple of quirks we might have fixed but didn't
  discover early enough)." And: "Unlike C and Java and especially C++, Go can be parsed without
  type information or a symbol table; there is no type-specific context."
- **Go spec** — https://go.dev/ref/spec — VERIFIED. "The syntax is compact and simple to parse,
  allowing for easy analysis by automatic tools such as integrated development environments."
  Grammar in "a variant of Extended Backus-Naur Form (EBNF)."
- **Go FAQ** — https://go.dev/doc/faq — VERIFIED, the richest of the three. Under *Why is the
  syntax so different from C?*: "the language has been designed to be easy to analyze and can
  be parsed without a symbol table. This makes it much easier to build tools… C and its
  descendants are notoriously difficult in this regard." Under *Why are declarations
  backwards?*: "In C, the notion is that a variable is declared like an expression denoting its
  type, which is a nice idea, but the type and expression grammars don't mix very well… Go
  mostly separates expression and type syntax and that simplifies things." Under *Why are there
  braces but no semicolons?*: "Semicolons, however, are for parsers, not for people" —
  semicolons "injected automatically, without lookahead, by the lexer."
- **The historical yacc (LALR(1)) grammar** —
  https://github.com/golang/go/blob/go1.4.3/src/cmd/gc/go.y — VERIFIED. Header
  `// Go language grammar.`, plus a section commented "manual override of shift/reduce
  conflicts" with `%left` precedence declarations. Go was literally a yacc grammar through
  Go 1.4; no source found where Pike or Cox says "LALR(1)" in those words — don't attribute
  that phrasing to them.

## 3. Elm

- **"Compiler Errors for Humans"** — https://elm-lang.org/news/compiler-errors-for-humans —
  VERIFIED (via browser; see SPA caveat below). Evan Czaplicki, 30 June 2015. Verbatim: "A lot
  of compiler error messages actually do suck… What happens when we accept that there is a
  problem here and try to do better?" On cost: "I found that generating such specific error
  messages required no significant changes to the type inference algorithm and imposed no
  noticeable performance cost. I just added an extra bit of info to each type constraint."
- **"Compilers as Assistants"** — https://elm-lang.org/news/compilers-as-assistants — VERIFIED
  (browser). 19 Nov 2015. "Compilers should be assistants, not adversaries." The release lists
  as a feature: "removes redundant syntax to improve the 'code texture' of Elm" — syntax
  deleted for readability, not capability.
- **"The Syntax Cliff"** — https://elm-lang.org/news/the-syntax-cliff — VERIFIED (browser).
  21 Oct 2019. **The strongest single Elm receipt for "error messages drive design"** — he
  rewrote the parser to produce teaching errors. Verbatim: "How many people fall off the syntax
  cliff and give up on a language or just quit programming entirely? I started wondering how
  much of this problem comes down to error message quality. Could I get the compiler to a point
  where people feel like it is actually helping them learn Elm syntax?" Worked examples where
  the error prints a correct-syntax example and a docs URL.
- **"The Hard Parts of Open Source"** — video https://www.youtube.com/watch?v=o_4EX4dPppA
  (Strange Loop, Sept 2018); transcript VERIFIED at
  https://raw.githubusercontent.com/matthiasn/talk-transcripts/master/Czaplicki_Evan/TheHardPartsOfOpenSource.md.
  On process: "even after I spend like a week trying to design something that way, I need to go
  out and show it to people, and see what objections they bring." On feature requests: "If
  there is something that you can think of in five minutes, or an hour, or a day, probably
  someone has thought about that and considered it." Caveat: mostly about community conflict —
  use for design *process*, not design *rationale*.
- **Elm's original design document** — https://elm-lang.org/assets/papers/concurrent-frp.pdf —
  VERIFIED (926 KB, text-extracted). "Elm: Concurrent FRP for Functional GUIs", Czaplicki,
  30 March 2012 (Harvard thesis).
- Dead end: https://elm-lang.org/news/what-is-success 404s. Don't cite it.

## 4. Unison (high priority)

**Syntax documentation**
- Docs index — https://www.unison-lang.org/docs/ — VERIFIED
- "Unison syntax at a glance" — https://www.unison-lang.org/docs/at-a-glance/ — VERIFIED.
  Signatures, delay forms (`do`, `_ ->`, `'`), `match … with` / `cases`, guards, as-patterns,
  `structural type`, records, ability sets `'{IO, Exception} ()`.
- Pattern matching — https://www.unison-lang.org/docs/language-reference/match-expressions-and-pattern-matching/ — VERIFIED
- Name resolution — https://www.unison-lang.org/docs/language-reference/name-resolution-and-the-environment/ — VERIFIED
- Note: there is no page titled "syntax overview"; the reference is ~60 leaf pages indexed from
  /docs/.

**The hashed-AST core — load-bearing citations**
- **"The big technical idea"** — https://www.unison-lang.org/docs/tour/_big-technical-idea/ —
  VERIFIED. Best single quote: "Each Unison definition is identified by a hash of its syntax
  tree." The procedure, verbatim: "all named arguments [are replaced] by positionally-numbered
  variable references, and all dependencies… [are replaced] by their hashes." The pointer
  metaphor: "Each Unison definition has a unique and deterministic address (its hash) in this
  vast immutable address space. Names are like pointers to addresses in this space. We can
  change what address a name points to, but the contents of each address are forever
  unchanging."
- **"The big idea"** — https://www.unison-lang.org/docs/the-big-idea/ — VERIFIED. Names are
  "separately stored metadata that don't affect the function's hash." Consequences: no builds,
  no dependency conflicts, renaming free. On rendering: you retrieve "any definition back into
  your text buffer (pretty-printed, and using the latest names for definitions)."
- **Hashes reference** — https://www.unison-lang.org/docs/language-reference/hashes/ —
  VERIFIED. "A hash in Unison is a 512-bit SHA3 digest of a term or a type's internal
  structure, excluding all names." "The hash of a term or type is its true name." Literal forms
  `#x`, `#x.n`, `#x#c`, `##Nat`. Printer detail: "When displaying code, Unison calculates the
  minimum length needed to distinguish each hash."
- **"How Unison reduces ecosystem churn"** — https://www.unison-lang.org/blog/reducing-churn/
  (10 Apr 2020) — VERIFIED. "Since Unison definitions reference each other by hash instead of
  by name, any moving or renaming breaks no code and generates no upgrade work for users."
- **FAQ, on hashing recursive cycles** —
  https://www.unison-lang.org/docs/usage-topics/general-faqs/ — VERIFIED. "Definitions never
  change, but the names we give them do." Mutually-recursive definitions hash as one cycle
  using De Bruijn indices, canonically sorted so the result is order-independent.
- **docs/metadata.markdown** in-repo —
  https://github.com/unisonweb/unison/blob/trunk/docs/metadata.markdown — VERIFIED. Makes
  "names are metadata" literal: `newtype Metadata = Metadata Reference`, stored as relations in
  the versioned namespace tree.

**ABT / term representation vs surface syntax**
- **codebase2/core/U/Core/ABT.hs** —
  https://github.com/unisonweb/unison/blob/trunk/codebase2/core/U/Core/ABT.hs — VERIFIED. Four
  constructors, verbatim: `data ABT f v r = Var v | Cycle r | Abs v r | Tm (f r)`. Binding
  lives in `Abs`; everything Unison-specific lives in the base functor `f`. `Eq` on terms is
  alpha equivalence ("renaming any aligned `Abs` ctors to use a common fresh variable") — which
  is exactly why names cannot be part of identity. Header comment cites the lineage:
  http://semantic-domain.blogspot.com/2015/03/abstract-binding-trees.html (Neel Krishnaswami).
- **unison-hashing-v2/src/Unison/Hashing/V2/ABT.hs** —
  https://github.com/unisonweb/unison/blob/trunk/unison-hashing-v2/src/Unison/Hashing/V2/ABT.hs
  — VERIFIED. The concrete "hash is a hash of the ABT" path; sibling Term.hs has
  `hashClosedTerm tm = ReferenceId (ABT.hash tm) 0`.
- **Chiusano, "Unison update 7: structured refactoring sessions"** (23 Apr 2015) —
  https://pchiusano.github.io/2015-04-23/unison-update7.html — VERIFIED. "I'm about 3/4 of the
  way through converting the backend to use abstract binding trees (ABTs)" — operations become
  ABT-generic across terms, types, declarations. Also: "All terms, types, and type declarations
  are uniquely identified by a nameless, content-based hash."
- **Chiusano, "A very early demo of semantic program layout"** (30 Sept 2014) —
  https://pchiusano.github.io/2014-09-30/semantic-layout.html — VERIFIED. Cleanest statement of
  the thesis, verbatim: "Although in Unison, there is no 'raw source' in textual form, there is
  only the syntax tree!" Layout "is computed dynamically" by a layout engine given available
  width; presentation kept "separately, where it belongs–in the layout algorithm."
- **Chiusano, "Why are we still programming like it's the punchcard era?"** (30 Sept 2014) —
  https://pchiusano.github.io/2014-09-30/punchcard-era.html — VERIFIED. The structured-editing
  manifesto.
- **Chiusano, "Making overly conservative language evolution a nonproblem"** (5 Oct 2014) —
  https://pchiusano.github.io/2014-10-05/refactoring.html — VERIFIED. Earliest published
  rationale found: "terms and types are identified uniquely by a nameless hash, with names
  stored as separate metadata."

**The pretty-printer as load-bearing**
- **Issue #282, "Dynamically rendered pretty source for codebase repo format"** —
  https://github.com/unisonweb/unison/issues/282 — VERIFIED. Chiusano: "The names of things are
  not fixed. We can't just generate static HTML for a definition like
  `factorial n = product (range 1 n)`, since the names of `product` and `range` will differ
  depending on what branch we're viewing this hash from. We could imagine 'baking' the names
  in, but that's pretty poor." His proposal is a function, not a string: "a
  `Relation Referent Name -> HTML`." And the consequence that makes printing hard: "because the
  names are dynamically chosen, we don't know the widths of anything in advance, which means we
  can't do pretty-printing accurately. We also can't do things like column alignment."
- **PrettyPrintEnv.hs** —
  https://github.com/unisonweb/unison/blob/trunk/parser-typechecker/src/Unison/PrettyPrintEnv.hs
  — VERIFIED (raw source fetched). The type IS the argument:
  ```haskell
  data PrettyPrintEnv = PrettyPrintEnv
    { termNames :: Referent -> [(HQ'.HashQualified Name, HQ'.HashQualified Name)],
      typeNames :: Reference -> [(HQ'.HashQualified Name, HQ'.HashQualified Name)]
    }
  ```
  A print environment is a function from hash to name. The stored tree has no names; names are
  supplied at render time. Exports `termNameOrHashOnly` / `typeNameOrHashOnly` — the printer
  degrades to showing a hash rather than failing.
- **TermPrinter.hs** —
  https://github.com/unisonweb/unison/blob/trunk/parser-typechecker/src/Unison/Syntax/TermPrinter.hs
  — VERIFIED (~101 KB). Imports `Unison.Syntax.Precedence (operatorPrecedence, …)` and
  `PrettyPrintEnv.FQN (Imports, Prefix, Suffix, elideFQN)` — re-derives operator precedence,
  `use`-clause elision, and name qualification on every render, because none of that survives
  in the tree. Teaching detail: it carries `etaReduce`, commented "Gets rid of unsightly `_eta`
  expansion in the pretty-printed output" — the printer actively undoes elaboration; output is
  a readable reconstruction, not a faithful serialization.
- **A tour of Unison** — https://www.unison-lang.org/docs/tour/ — VERIFIED. "Unison code is not
  saved as text-based file content." Demonstrable round-trip: "Unison inserts precise `use`
  statements when rendering your code, and formats it according to its own pretty-printing
  conventions" — a definition written without `use` clauses comes back out of `view` carrying
  `use Nat * ==`.

**Foundational writeups and talks**
- Original announcement, "A new project: Unison" (14 Sept 2014) —
  https://pchiusano.github.io/2014-09-14/unison.html — VERIFIED
- Full Chiusano Unison post index (20 posts) — https://pchiusano.github.io/unison/ — VERIFIED
- Strange Loop 2019 talk — https://thestrangeloop.com/2019/unison-a-new-distributed-programming-language.html
  — VERIFIED; video https://www.youtube.com/watch?v=gCWtkvDQ2ZI
- Official talks index — https://www.unison-lang.org/talks/ — VERIFIED
- unisonweb/unison README — https://github.com/unisonweb/unison — VERIFIED: "code is stored as
  an AST in a database"
- Announcing Unison 1.0 — https://unison-lang.org/unison-1-0/ — VERIFIED. Note
  /blog/unison-1-0/ 404s; use the bare path.
- Warning: unisonweb.org 301s to unison-lang.org and old unisonweb.org/YYYY-MM-DD/… article
  paths are not reachable. Don't cite them.

## 5. Example-driven / "write the programs first" as explicit methodology

Honest finding first: **none of the three classics states "write the programs you want to write
first" as a named methodology.** Hoare argues simplicity, Wirth argues regularity, Steele
argues growth. The crisp methodological statement exists — in Go's process documents.

**The actual methodology receipts (strongest first)**

- **Russ Cox, "Toward Go 2"** — https://go.dev/blog/toward-go2 — VERIFIED. 13 July 2017. The
  thesis, institutionalized: "Every major potential change to Go should be motivated by one or
  more experience reports documenting how people use Go today and why that's not working well
  enough." And: "Experience reports like these turn an abstract problem into a concrete one and
  help us understand its significance." Applied against himself on generics: "I've been
  examining generics recently, but I don't have in my mind a clear picture of the detailed,
  concrete problems that Go users need generics to solve."
- **Go Experience Reports wiki** — https://go.dev/wiki/ExperienceReports — VERIFIED. Required
  structure, verbatim: "(1) what you wanted to do, (2) what you actually did, and (3) why that
  wasn't great, illustrating those by real concrete examples, ideally from production use."
  Focus on problems, not solutions.
- **Rust's RFC template** (§1) is the same discipline in a different form: *Guide-level
  explanation* mandates "Explaining the feature largely in terms of examples" — you write the
  programs before you specify the feature.

**The classics, all verified with extracted text**

- **C.A.R. Hoare, "Hints on Programming Language Design" (1973)** — working PDF at
  http://i.stanford.edu/pub/cstr/reports/cs/tr/73/403/CS-TR-73-403.pdf — VERIFIED (379 KB,
  parsed; title page "STANFORD ARTIFICIAL INTELLIGENCE LABORATORY MEMO AIM-224 /
  STAN-CS-73-403 … DECEMBER 1973"). Keynote basis: SIGACT/SIGPLAN POPL, Boston, Oct 1973.
  Central claim, verbatim: "the objective criteria for good language design may be summarized
  in five catch phrases: simplicity, security, fast translation, efficient object code, and
  readability." On simplicity: "Without simplicity, even the language designer himself cannot
  evaluate the consequences of his design decisions." Caveats: HTTP-only; archive.org mirror of
  the same bytes:
  https://web.archive.org/web/2020id_/http://i.stanford.edu/pub/cstr/reports/cs/tr/73/403/CS-TR-73-403.pdf
  — VERIFIED (identical 379,372 bytes). Two commonly-cited copies are BAD: the Grinnell
  hoare-design.pdf is a student commentary page, not the paper; the DTIC copy 403s to scripted
  clients.
- **Niklaus Wirth, "Good Ideas, Through the Looking Glass" (2005/2006)** —
  https://people.inf.ethz.ch/wirth/Articles/GoodIdeas_origFig.pdf — VERIFIED (202 KB, parsed;
  header "Zürich, 2. 2. 2005 / 15. 6. 2005"). Journal: Computer 39(1):28–39, 2006, DOI
  10.1109/MC.2006.20. §4.1 "Notation and Syntax", verbatim: "It has become fashionable to
  regard notation as a secondary issue depending purely on personal taste. This may partly be
  true; yet the choice of notation should not be considered an arbitrary matter. It has
  consequences, and it reveals the character of a language." Worked example — `=` for
  assignment as "a notorious example for a bad idea," forcing `==` for equality, which "gave
  rise to similar bad ideas using `++`, `--`, `&&` etc."
- **Niklaus Wirth, "On the Design of Programming Languages" (IFIP Congress 1974, pp. 386–393)**
  — https://web.eecs.umich.edu/~bchandra/courses/papers/Wirth_Design.pdf — VERIFIED (505 KB,
  parsed; OCR rough). Abstract, verbatim: "a language should be simple, and that simplicity
  must be achieved by transparence and clarity of its features and by a regular structure,
  rather than by utmost conciseness and unwanted generality." Mirror (inferred, not fetched):
  https://people.csail.mit.edu/feser/pld-s23/Wirth_Design.pdf
- **Guy Steele, "Growing a Language" (OOPSLA 1998)** —
  https://www.cs.virginia.edu/~evans/cs655/readings/steele.pdf — VERIFIED (175 KB, parsed).
  Thesis, verbatim: "I should not design a small language, and I should not design a large one.
  I need to design a language that can grow. I need to plan ways in which it might grow—but I
  need, too, to leave some choices so that other persons can make those choices at a later
  time." And: "languages have now reached that large size where they can not be designed all at
  once, much less built all at once." Journal: Higher-Order and Symbolic Computation 12:221–236
  (1999). Video: https://archive.org/details/GrowingALanguageByGuySteeleAhvzDzKdB0 — VERIFIED.

**Bonus, the "design principles" genre**
- **Dan Ingalls, "Design Principles Behind Smalltalk" (BYTE, Aug 1981)** —
  https://www.cs.virginia.edu/~evans/cs655/readings/smalltalk.html — VERIFIED. *Personal
  Mastery* — "If a system is to serve the creative spirit, it must be entirely comprehensible
  to a single individual"; *Purpose of Language* — "To provide a framework for communication."
- **Bjarne Stroustrup, "Evolving a Language in and for the Real World: C++ 1991–2006" (HOPL
  III)** — https://www.stroustrup.com/hopl-almost-final.pdf — VERIFIED (690 KB, parsed).
  Quoting Stepanov's definition of generic programming: "Lift algorithms and data structures
  from concrete examples to their most general and abstract form." Full "C++ in Real-World Use"
  section (§7).

## 6. Concrete vs abstract syntax / AST-first

**Best citable source: Robert Harper, *Practical Foundations for Programming Languages* (2nd
ed., Cambridge UP, 2016), Chapter 1 "Abstract Syntax."**

- Book page: https://www.cs.cmu.edu/~rwh/pfpl/ — VERIFIED
- Free abbreviated edition PDF: https://www.cs.cmu.edu/~rwh/pfpl/abbrev.pdf — VERIFIED (790 KB,
  parsed; Chapter 1 present in full). Note 2nded.pdf 404s — use abbrev.pdf.
- Chapter 1: §1.1 Abstract Syntax Trees, §1.2 Abstract Binding Trees, §1.3 Notes.

Verbatim from Chapter 1 — the passage that says concrete syntax is secondary:

> The informal concept of syntax involves several distinct concepts. The surface, or concrete,
> syntax is concerned with how phrases are entered and displayed on a computer. The surface
> syntax is usually thought of as given by strings of characters from some alphabet… The
> structural, or abstract, syntax is concerned with the structure of phrases, specifically how
> they are composed from other phrases. At this level a phrase is a tree, called an abstract
> syntax tree, whose nodes are operators that combine several phrases to form another phrase.
> The binding structure of syntax is concerned with the introduction and use of identifiers…
>
> We will not concern ourselves in this book with concrete syntax, but will instead consider
> pieces of syntax to be finite trees augmented with a means of expressing the binding and
> scope of identifiers within a syntax tree.

And the abstract binding tree citation, directly connecting to Unison's implementation:

> First, we define abstract syntax trees, or asts, which capture the hierarchical structure of
> a piece of syntax, while avoiding commitment to their concrete representation as a string.
> Second, we augment abstract syntax trees with the means of specifying the binding
> (declaration) and scope (range of significance) of an identifier. Such enriched forms of
> abstract syntax are called abstract binding trees, or abts for short.

Harper on why it matters practically: binding and scope "are infamously difficult to define
properly, and are the mother lode of bugs for language implementors."

**The practitioner-level source**
- **Robert Nystrom, *Crafting Interpreters*, "Representing Code"** —
  https://craftinginterpreters.com/representing-code.html — VERIFIED. Verbatim: "In a parse
  tree, every single grammar production becomes a node in the tree. An AST elides productions
  that aren't needed by later phases." He authors the tree shape directly (typed node classes
  generated from a declarative list), then the rest follows.

**Standard-textbook anchors**
- **Andrew Appel, *Modern Compiler Implementation* (Cambridge UP, 1998)** —
  https://www.cs.princeton.edu/~appel/modern/ — VERIFIED; TOC
  https://www.cs.princeton.edu/~appel/modern/toc.html — VERIFIED. Chapter order is the teaching
  point: 2. Lexical Analysis → 3. Parsing → 4. Abstract Syntax → 5. Type Checking. Free sample
  chapters: java/extract.pdf, ml/extract.pdf, c/extract.pdf.
- **Benjamin Pierce, *Types and Programming Languages* (MIT Press, 2002)** —
  https://www.cis.upenn.edu/~bcpierce/tapl/ (frameset) and
  https://www.cis.upenn.edu/~bcpierce/tapl/main.html (content) — VERIFIED. No specific
  abstract-vs-concrete passage verified inside TAPL — Harper is the safer citation for that.
- **McCarthy's abstract syntax (1962/1963)** — NOT VERIFIED. No fetched, content-confirmed PDF
  landed this session for "Towards a Mathematical Science of Computation" / "A Basis for a
  Mathematical Theory of Computation." Treat any McCarthy URL as unverified until checked;
  Harper §1.3 Notes is where PFPL attributes the lineage.

## Housekeeping

- Bad URLs, all checked and confirmed broken: go.dev/design/go2draft-type-parameters (302 to
  empty Gitiles stub) · cs.cmu.edu/~rwh/pfpl/2nded.pdf (404) · elm-lang.org/news/what-is-success
  (404) · the Grinnell hoare-design.pdf (student commentary, not the paper) · apps.dtic.mil
  (403 to scripts) · unisonweb.org/YYYY-MM-DD/… (originals gone) ·
  unison-lang.org/blog/unison-1-0/ (404; use unison-lang.org/unison-1-0/).
- elm-lang.org is a JavaScript SPA: plain HTTP fetchers get an empty shell; the three Elm posts
  were retrieved through a real browser. Automated link-checkers will report them dead when
  they are not.

---

# Part II — AST-first and abstract-syntax citations (second late child, persisted 2026-08-25)

> Provenance: a supplementary child dispatched by the syntax-grammar reader on Part I item 6
> (McCarthy / Appel / Pierce), reporting after both its parent and Part I landed; persisted by
> the coordinator. All sources fetched and read first-hand by the child.

## Corrections to Part I

- **Appel sample chapters are dead**: `cs.princeton.edu/~appel/modern/{ml,java,c}/extract.pdf`
  all return 404 as of today — Part I §6 lists them as free samples; do not link them. Only
  `toc.html`, `description.html`, and `java/preface.html` are live.
- **Nystrom is a foil, not support, for AST-first**: Crafting Interpreters derives the tree
  from the grammar — verbatim: "The rules and productions we define for Lox are also our guide
  to the tree data structure we're going to implement to represent code in memory." Use him
  for the AST-vs-parse-tree definition and as an honest counter-example.

## 1. McCarthy — the origin of "abstract syntax"

**"Towards a Mathematical Science of Computation" (IFIP Congress 1962) — THE source.**
Landing: http://www-formal.stanford.edu/jmc/towards.html — VERIFIED. PDF:
http://www-formal.stanford.edu/jmc/towards.pdf — VERIFIED (192,195 bytes, text-extracted).
Note: the commonly cited jmc.stanford.edu host has a BROKEN TLS certificate — use
www-formal.stanford.edu, same archive, valid cert.

McCarthy's own first-use claim, verbatim from the landing page: "I think this paper includes
the first use of the term abstract syntax and maybe the first occurrence of the idea."

§12 "Abstract Syntax of Programming Languages", verbatim:

> The form of syntax we shall now describe differs from the Backus normal form in two ways.
> First, it is analytic rather than synthetic; it tells how to take a program apart, rather
> than how to put it together. Second, it is abstract in that it is independent of the notation
> used to represent, say sums, but only affirms that they can be recognized and taken apart.

The indifference-to-notation line: "That is why we need not care whether sums are represented
by a + b, or +ab, or (PLUS A B), or even by Gödel numbers 7^a 11^b."

Directly on "design the AST first": "Once the abstract syntax of a language has been decided,
then one can choose the domain of symbolic expressions to be used."

McCarthy gives analytic/synthetic pairs (`isconst`/`issum`…; `addend`/`augend`…;
`mksum`/`mkprod`) and calls a syntax **regular** when three round-trip laws hold — literally a
constructor/destructor algebra with beta/eta-style laws.

**Negative finding**: "A Basis for a Mathematical Theory of Computation"
(www-formal.stanford.edu/jmc/basis1.pdf — VERIFIED, 264,228 bytes) does NOT contain the string
"abstract syntax". Cite towards.pdf, not basis1.pdf, for the distinction.

## 2. Textbook treatments

- **Appel, Modern Compiler Implementation** — official page + TOC VERIFIED. Chapter 4 is
  "Abstract Syntax" (§ Semantic actions, § Abstract parse trees), sitting after Parsing:
  Appel's framing is abstract syntax as the clean interface between parser and later phases.
- **Pierce, TAPL** — page/TOC VERIFIED (contents.pdf confirms §3.2/§4.1 "Syntax", Ch. 6
  "Nameless Representation of Terms"). Honest limitation: no free chapter text exists — do NOT
  fabricate a TAPL quote; cite structurally.
- **Pierce et al., Software Foundations Vol. 1, Imp chapter** — the free, QUOTABLE Pierce
  statement (https://softwarefoundations.cis.upenn.edu/lf-current/Imp.html — VERIFIED),
  verbatim:

> In this chapter, we'll mostly elide the translation from the concrete syntax that a
> programmer would actually write to these abstract syntax trees -- the process that, for
> example, would translate the string `1 + 2 × 3` to the AST
> `APlus (ANum 1) (AMult (ANum 2) (ANum 3))`.

  And on BNF: "The BNF is more informal… Some additional information -- and human intelligence
  -- would be required to turn this description into a formal definition… The Rocq version
  consistently omits all this information and concentrates on the abstract syntax only." The
  cleanest free statement that the inductive datatype IS the language and the grammar is the
  informal, secondary artifact.

## 3. "Design the AST first, then the grammar"

**Harper, PFPL §4.1 — the strongest citation.** (abbrev.pdf VERIFIED; note 3rded.pdf is 404.)
Verbatim:

> When defining a language we shall be primarily concerned with its abstract syntax, specified
> by a collection of operators and their arities. The abstract syntax provides a systematic,
> unambiguous account of the hierarchical and binding structure of the language, and is
> considered the official presentation of the language. However, for the sake of clarity, it is
> also useful to specify minimal concrete syntax conventions, without going through the trouble
> to set up a fully precise grammar for it.

Abstract syntax = "the official presentation of the language"; concrete syntax gets "minimal
conventions" and not even "a fully precise grammar." The single best quote in this packet.

**Cornell CS 4120 lecture notes** (courses.cs.cornell.edu/cs4120/2021sp/notes/ast/ — VERIFIED),
verbatim: "a programming-language theorist is likely to consider the AST as the true program,
with its original parsed representation as an unfortunate necessity for obtaining it."

**ModelCC (Quesada, Berzal & Cubero)** — the most literal published AST-first methodology.
arXiv:1111.3970 + arXiv:1301.4858, both VERIFIED. Verbatim: "starting from a single abstract
syntax model (ASM) representing the core concepts in a language, language designers would later
develop one or several concrete syntax models (CSMs)." One ASM → many CSMs, explicitly.

**Edinburgh Compiling Techniques Lecture 8** (opencourse.inf.ed.ac.uk, PDF VERIFIED) — teaches
grammar→AST (another foil), but establishes the AST is a design choice: "For a given concrete
grammar, there exists numerous abstract grammars. We pick the most suitable grammar for the
compiler."

## 4. Abstract binding trees — the chain closes at Unison

**Harper, PFPL §1.2**, verbatim: "The crucial principle is that any use of an identifier should
be understood as a reference, or abstract pointer, to its binding. One consequence is that the
choice of identifiers is immaterial, so long as we can always associate a unique binding with
each use of an identifier." Displayed principle: "Abstract binding trees are always identified
up to α-equivalence." And the warning: the concepts "are infamously difficult to define
properly, and are the mother lode of bugs for language implementors."

**PFPL §1.3 Notes** attribute ABTs to NuPRL (Constable 1986) and Martin-Löf's system of arities
(Nordström et al. 1990), enriched per Pitts and Stark (1993) — and Harper himself draws the
McCarthy → Lisp → ML → ABT lineage.

**Krishnaswami, "Abstract Binding Trees" (Semantic Domain, 13 Mar 2015)** — VERIFIED — was
written in direct reply to a question from Paul Chiusano (Unison's creator). Verbatim: "The
technique I favor is what Bob Harper has dubbed 'abstract binding trees', and documented in
Chapter 1 of his book." And on layering: "the parser shouldn't know too much about the binding
or type structure of a program, because conceptually binding structure is determined after we
produce the syntax tree."

**Unison.ABT** (unison-core/src/Unison/ABT.hs — VERIFIED, 22,342 bytes) carries the citation
literally in its module header comment: `-- | Based on:
http://semantic-domain.blogspot.com/2015/03/abstract-binding-trees.html`.

**The verified end-to-end chain**: McCarthy 1962 → Harper PFPL Ch. 1 → Krishnaswami 2015
(answering Chiusano) → `Unison.ABT` in production. The chain is itself a teaching spine.

## Link-health additions (beyond Part I's list)

Broken: jmc.stanford.edu (TLS) · appel/modern/{ml,java,c}/extract.pdf (404) · pfpl/3rded.pdf
(404). Live: towards.pdf, basis1.pdf, softwarefoundations Imp.html, pfpl/abbrev.pdf, Cornell
CS4120 notes, arXiv 1111.3970 + 1301.4858, semantic-domain ABT post, Unison.ABT raw.

## Editorial flag worth keeping

The split is real and should be named, not papered over: the theory sources (PFPL, Software
Foundations, Cornell) and the model-driven literature (ModelCC) argue **AST → grammar**; the
practitioner sources (Crafting Interpreters, Edinburgh) teach **grammar → AST**. The spine
program is structurally on the theory side — the carrier is designed first and is the identity
bearer; surfaces are derived views — and the honest way to teach that is to show both camps.

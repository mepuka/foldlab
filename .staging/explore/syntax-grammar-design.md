# Syntax and Grammar Design: A Working Guide

*Written for an engineer who is fluent in TypeScript and Effect, new to language design, and building a content-addressed core language with a scripting surface to come.*

---

## How to read this

You said the syntax design process blows your mind. Good — it should, a little. But it is not magic, and it is not mostly taste. Underneath the taste there is a small amount of real theory (about two hours' worth), a handful of engineering techniques that recur in every language you have ever used, and a design *process* that working language designers follow fairly explicitly and often write down in public.

This document is organized as a path:

1. **How languages actually get designed** — the process, with receipts from real projects.
2. **Grammar formalism from zero** — alphabets to ambiguity, the minimum theory that pays.
3. **Parser technology** — recursive descent, Pratt parsing, combinators, generators.
4. **Parsing in Lean 4** — first-hand reconnaissance, verified on your machine.
5. **Verified syntax** — what can actually be proved about parsers and printers, and what it costs.
6. **A worked micro-example** — a toy language carried from wish-list to Lean theorem statement.
7. **A checklist** — the process you would follow, annotated with the theorem guarding each step.

Everything labeled **VERIFIED** in this document was run or read first-hand on this machine, and the transcript is quoted. Everything else is cited to a URL. Where I could not confirm something, it says so.

Two conventions for the code:

- Lean snippets marked **`[compiles]`** were compiled with `lean` v4.33.1 (`x86_64-w64-windows-gnu`, commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`) and the exact exit code is reported.
- Quotations from the reference clones give absolute file paths and line numbers so you can go read the surrounding context yourself.

---

## 1. How languages actually get designed

### 1.1 The process, in the order it really happens

Here is the shape of the process as practiced, as opposed to the order a compiler textbook presents it in. Textbooks go grammar → parser → AST → semantics, because that is the order data flows at runtime. **Designers work in nearly the opposite order.**

1. **Write the programs you wish you could write.** Not a grammar. Not a type system. Actual example programs, in a text file, that do not run and cannot be parsed by anything. The goal is to find out what you actually want the language to feel like.
2. **Find the recurring shapes.** Look at your examples and ask what *things* are there — a binding, a call, a match, a pipeline. These become your abstract syntax.
3. **Design the AST.** A datatype. This is the durable artifact; it will outlive several surface syntaxes.
4. **Design the surface syntax against the AST.** Now, and only now, ask how each AST node should look in text.
5. **Write the grammar down.** In EBNF or equivalent, as a real file.
6. **Check the grammar is in a well-behaved class** — this is where ambiguity gets caught.
7. **Implement, and discover what you got wrong.** The examples from step 1 become your test suite.
8. **Iterate on evidence** — real programs written by real users applying real pressure.

Steps 1 and 8 are the ones inexperienced designers skip, and they are where the actual design happens. Steps 5 and 6 are the ones that make the difference between a language and a pile of parser special cases.

### 1.2 Concrete syntax vs abstract syntax

This distinction is the hinge of the whole subject, so let me be precise.

**Concrete syntax** is the text. Every character of it: `if`, the spaces, the parentheses, the semicolons, the comments, the line breaks. It is what the user types and reads.

**Abstract syntax** is the structure. `If(cond, then, else)` — three children and a tag. No parentheses (they were grouping, not content), no keyword (it is the tag now), no whitespace.

The parse tree from §2.4 is *concrete* syntax as a tree: it has a node for every grammar production, including the boring ones. The AST is what remains after you delete everything that was there only to help the parser.

```
Concrete:  1 + 2 * 3            (text)
Parse tree: expr(expr(term(factor(1))), +, term(term(factor(2)), *, factor(3)))
AST:        Add(Lit 1, Mul(Lit 2, Lit 3))
```

Three representations of one program. The last one is the one you write a type checker against.

**Where it gets interesting** is that the boundary is a *design decision*, not a fact. Does a paren become an AST node? Do comments? Do source positions? Every answer is defensible, and each has consequences:

| Decision | Buys | Costs |
|---|---|---|
| Keep `paren` nodes | Trivial faithful reprinting | AST no longer canonical — fatal for hashing |
| Keep comments in the AST | Formatters and doc tools work | Every pass must handle them; equality gets murky |
| Keep source spans | Good error messages, LSP | Structural equality needs to ignore them |

Concrete keeps parens (§4.4). Unison does not. Neither is wrong; they have different jobs. **You are building a content-addressed core, which means your AST's identity is a hash, which means canonicality is not optional.** That single fact settles several of these decisions for you, and it is worth writing down early.

### 1.3 Why the AST comes first

Three reasons, and the third is the one that matters for you.

1. **The AST is what everything else consumes.** Type checker, evaluator, optimizer, printer, serializer, hasher. The grammar is consumed by exactly one thing: the parser.
2. **The AST is more stable.** Surface syntax changes constantly during design — you will rename keywords, move sigils, change delimiters. The set of *things the language can express* changes much more slowly.
3. **There may be several surfaces.** A textual script syntax, a structured editor, a JSON encoding for agents, a rendering from hashes. These are all *views* of one AST. If you design the AST against one particular textual syntax, the other views inherit that syntax's accidents.

Reason 3 is the Unison argument, and §1.7 is about it.

### 1.4 Case study: Rust's RFC process

Rust's design happens in public, in a repository, using a template — and the template is itself a teaching artifact, because it is a list of the questions a language designer is supposed to answer.

The template lives at <https://github.com/rust-lang/rfcs/blob/master/0000-template.md>. **VERIFIED by fetching**, its sections are, in order:

1. Summary
2. Motivation
3. Guide-level explanation
4. Reference-level explanation
5. Drawbacks
6. Rationale and alternatives
7. Prior art
8. Unresolved questions
9. Future possibilities

Look at what that structure forces.

- **"Guide-level explanation"** comes *before* **"Reference-level explanation"**. You must first explain the feature the way you would teach it to a user — with examples, in prose — and only then specify it precisely. A proposal that cannot be taught is rejected before it is specified.
- **"Drawbacks"** is a mandatory section. You must argue against your own proposal.
- **"Rationale and alternatives"** requires you to have considered other designs and say why yours won.
- **"Prior art"** requires you to know what other languages did.
- **"Unresolved questions"** legitimizes saying "I don't know yet," which is what keeps proposals honest rather than overclaiming.

**Steal this template.** Not the process — you do not need public consensus for a personal language — but the *questions*. Before you add syntax, write the guide-level explanation. If you cannot explain the feature to a hypothetical user in a paragraph with an example, the syntax is not ready. That single discipline will kill more bad syntax than any amount of grammar theory.

### 1.5 Case study: Go, and the price of a delimiter

Go's generics went through a long public design process; the accepted design document is at <https://go.googlesource.com/proposal/+/refs/heads/master/design/43651-type-parameters.md>. On the syntax question it says — **VERIFIED by fetching**:

> "To distinguish the type parameter list from the regular parameter list, the type parameter list uses square brackets rather than parentheses."

And the introductory article (<https://go.dev/blog/intro-generics>) says only:

> "A type parameter list looks like an ordinary parameter list, except that it uses square brackets instead of parentheses."

I want to be honest about what I did and did not confirm: **I fetched both documents and neither contains an extended discussion of parsing ambiguity.** The design documents present the bracket choice as a matter of distinguishability. The detailed parsing arguments in Go's process happened in the issue tracker rather than in the accepted proposal, and I did not verify those, so I am not going to characterize them.

What I *can* say, from the primary sources plus §2.2's first-hand evidence, is the structural point:

- Go chose `[]`. That collides with indexing (`x[i]` vs `x[T]`) and with array types, and must be resolved somewhere.
- C++, Java, Rust, and Concrete chose `<>`. That collides with the less-than operator and with right-shift, and Concrete's `pendingGt` field (§2.2) is the visible scar.

**There is no delimiter that is free.** `<>`, `[]`, and `()` are all already operators or already grouping. This is the cleanest illustration in the document of the real nature of syntax design: you are not choosing between a good option and a bad one, you are choosing which cost to pay, and the skill is in knowing what the costs *are* before you commit.

### 1.6 Case study: a syntax review in progress

The most useful design document I found is not published on the web — it is in the reference clone, and it shows the process mid-flight rather than after the fact. `C:\Users\kokok\Dev\foldlab\.reference\clones\concrete\research\language\ll1-syntax-review.md` — **VERIFIED by reading**.

It opens by stating the constraint before any candidate:

> Concrete should keep the parser LL(1). Syntax cleanup is allowed only when it:
> - keeps parsing local and token-driven
> - avoids context-sensitive parse decisions
> - pushes inference or disambiguation into elaboration rather than the grammar
> - does not add multiple competing syntaxes for the same construct

Then each candidate change gets the same three-part treatment: the current surface, the proposed surface, and **"Why it is LL(1)-safe."** For example, on unifying `Result#Ok` with `Result::Ok`:

> - this is a token-level qualification change, not a context-sensitive grammar change
> - `::` remains a distinct qualification token
> - the parse shape stays regular

Three things to take from this document.

**First, the constraint is stated before the candidates.** Every proposal is evaluated against a fixed, written-down rule. This is the difference between design and drift.

**Second, there is an explicit non-goals list.** Proposals that are *rejected on principle*, written down so the argument does not have to be re-had:

> - bare enum variants such as `Ok` without qualification
> - block `defer`
> - parser-driven generic inference
> - multiple equivalent syntaxes for enum construction or matching

A list of things you have decided *not* to do is one of the most valuable documents a language project can have. It is also the one nobody writes.

**Third, and best, the document schedules itself:**

> This review should happen:
> - after the pressure sets
> - during stdlib/examples shaping
> - before the first-release surface freeze
>
> That is late enough for the changes to be evidence-driven, but early enough to avoid freezing an obviously awkward surface.

"Late enough to be evidence-driven, early enough to avoid freezing an awkward surface." That is the entire timing problem of syntax design in one sentence, and it is the answer to the question you will ask yourself repeatedly: *should I fix this now or later?* Later — but before the freeze, and with examples in hand.

### 1.7 Case study: Unison, where the AST is the artifact

This is the one that matters most for what you are building, so I read the source rather than the marketing.

Unison stores code as a **content-addressed AST**. A definition's identity is the hash of its structure. From that, one consequence follows that reframes everything in §1.2: **names are not part of the code.**

Look at the type. `C:\Users\kokok\Dev\foldlab\.reference\clones\unison\parser-typechecker\src\Unison\PrettyPrintEnv.hs:43-48` — **VERIFIED by reading**:

```haskell
data PrettyPrintEnv = PrettyPrintEnv
  { -- names for terms, constructors, and requests; e.g. [(original name, relativized and/or suffixified pretty name)]
    termNames :: Referent -> [(HQ'.HashQualified Name, HQ'.HashQualified Name)],
    -- names for types; e.g. [(original name, possibly suffixified name)]
    typeNames :: Reference -> [(HQ'.HashQualified Name, HQ'.HashQualified Name)]
  }
```

A `PrettyPrintEnv` is *a pair of functions from hash-references to names*. It is an argument you supply **at printing time**. The term itself contains references, not identifiers. And the module exports `termNameOrHashOnly` — the fallback when no name is known is to print the hash.

The consequences are worth spelling out, because they are the payoff of the design:

- **Renaming is not a code change.** It updates the name→hash mapping. Every definition's hash is unchanged, so nothing needs recompiling and no dependent code breaks. Rename is O(1) and cannot introduce a bug.
- **The surface syntax is a rendering, not the truth.** There is no canonical text for a definition. There is a tree, plus a naming environment, plus a printer.
- **Which makes the printer load-bearing in a way it is not in a normal compiler.** In a text-first language the printer is a convenience (a formatter). In Unison it is *the only way to see your code*. A printer bug is not cosmetic; it is a bug in the display of the truth.

That last point is why Unison's `TermPrinter.hs` is 104 KB and threads ambient precedence carefully (§4.4), and it is why the roundtrip property in §5 is not academic for a system like this. **If your spine is content-addressed, you are signing up for Unison's situation: the printer is part of your trusted computing base for readability.**

And it is why Unison guards it the way it does. `unison-src/transcripts/idempotent/` contains **339 files** — **VERIFIED by counting** — each a literate session whose recorded output must reproduce exactly when re-run. Because those sessions push code through the hashed store and back out through the printer, all 339 are executable roundtrip tests. There is a sibling `errors/` directory with 40 more that pin failure messages.

Note also the code organization, which reflects the conceptual split: Unison has a dedicated `unison-syntax` package (lexer, parser, name syntax) separate from the core term representation, and a separate `lib/unison-pretty-printer`. **Syntax is a peripheral concern with its own package boundary; the hashed core does not depend on it.** That is a structural expression of "the surface is a view," and it is a layout worth copying.

### 1.8 What to take from all four

| Source | The transferable idea |
|---|---|
| Rust RFCs | Force yourself to write the *guide-level explanation* and the *drawbacks* before the specification. |
| Go generics | Every delimiter is already taken. Choose which cost to pay, knowingly. |
| Concrete's syntax review | State the constraint before the candidates. Keep a written non-goals list. Schedule the review for "after the pressure, before the freeze." |
| Unison | If the AST is the artifact, the printer is load-bearing, names live outside the term, and the surface syntax is one view among several. |

---

## 2. Grammar formalism from zero

This is the theory chapter. It is short on purpose. The formal apparatus you need to design a language well is genuinely small — perhaps five definitions — and the payoff is that one specific failure mode (ambiguity) becomes something you can *see coming* instead of something that ambushes you three months in.

### 2.1 Alphabets, strings, languages

Start absurdly concrete.

An **alphabet** `Σ` is a finite set of symbols. For a programming language it is usually Unicode scalar values, or bytes.

A **string** over `Σ` is a finite sequence of symbols from `Σ`. The empty string is written `ε`.

`Σ*` is the set of *all* finite strings over `Σ`.

A **language** over `Σ` is any subset of `Σ*`.

That last definition is the one that reframes things. Your scripting language, formally, *is a set of strings* — the set of texts that are legal programs. Everything in this chapter is about how to describe that set finitely, when the set itself is infinite.

You already have the intuition from types. `Σ*` is like `string`; a language is like a refinement `string & { __brand: "valid program" }`. A grammar is the decision procedure that inhabits the brand.

### 2.2 Two phases: lexing and parsing

Essentially every real language splits recognition into two passes:

1. **Lexing** (scanning, tokenization): `string → Token[]`. Chops the character stream into words — identifiers, numbers, operators, punctuation — and throws away whitespace and comments.
2. **Parsing**: `Token[] → AST`. Discovers the *structure* over those words.

Why split? Two reasons, one theoretical, one practical.

The theoretical reason: **token shapes are regular; program structure is not**. `[a-zA-Z_][a-zA-Z0-9_]*` is a regular expression, recognizable by a finite automaton with no memory. But "parentheses are balanced" is provably *not* regular — you need unbounded memory to count nesting depth. That is the jump from regular to context-free. Splitting the phases lets you use the cheap, fast, totally-decidable machinery for the part that only needs it.

The practical reason: it makes the grammar readable. A grammar written over characters drowns in whitespace handling. A grammar written over tokens is about the language.

**The lexer is where the dirty tricks live.** A few that recur everywhere:

- **Maximal munch**: given `<=`, the lexer must produce one `LEQ` token, not `LT` then `ASSIGN`. The rule is "always take the longest match." It is a rule about the lexer, not the grammar, and it silently decides things. `a--b` in C lexes as `a -- b`, not `a - (-b)`, purely from maximal munch.
- **Keywords vs identifiers**: `if` matches the identifier pattern. Lexers typically lex it as an identifier and then look it up in a keyword table. Which means *reserving a keyword is a breaking change* — every program using `cap` as a variable name breaks the day you make `cap` a keyword.
- **Context-sensitive keywords**: the escape hatch for the above. Concrete does exactly this. From `C:\Users\kokok\Dev\foldlab\.reference\clones\concrete\Concrete\Frontend\Parser.lean:91-100`:

  ```lean
  def expectIdent : ParseM String := do
    let tk ← peek
    let sp ← peekSpan
    match tk with
    | .ident name => advance; return name
    -- `cap` and `type` are context-sensitive keywords that are also valid as
    -- field names, variable names, and import symbols.
    | .cap_ => advance; return "cap"
    | .type_ => advance; return "type"
    | other => throwParse s!"expected identifier, got {other}" (span := some sp)
  ```

  The lexer produces a dedicated `cap` token, and the parser *accepts it back* as an identifier wherever an identifier is legal. That is how you get a keyword without stealing the word.

- **The `>>` problem.** This one is famous and worth internalizing, because it is the clearest example of the lexer and the grammar disagreeing. In `Option<Heap<T>>`, maximal munch lexes the trailing `>>` as a single right-shift token. But the grammar wants two separate `>` closers. Every language with C-style generics hits this: C++ needed a rule change in C++11, Java has a special case, Rust splits the token in the parser. Concrete's fix is visible in its parser state — `C:\...\concrete\Concrete\Frontend\Parser.lean:31` and `:82-89`:

  ```lean
  structure ParserState where
    tokens : Array Token
    pos : Nat
    pendingGt : Bool := false  -- true when >> was split and one > remains
  ```
  ```lean
  def expect (expected : TokenKind) : ParseM Unit := do
    let actual ← peek
    let sp ← peekSpan
    if actual == expected then advance
    else if expected == .gt && actual == .shr then
      -- Split >> into > + pending >, for nested generics like Option<Heap<T>>
      modify fun s => { s with pos := s.pos + 1, pendingGt := true }
    else throwParse s!"expected {expected}, got {actual}" (span := some sp)
  ```

  **Design lesson, and it is the first real one in this document:** this entire mechanism exists because the language chose `<` `>` as type-argument delimiters. Pick a delimiter that is not also an operator — Go's `[T]`, ML's `'a list` — and the problem does not exist. *A syntax choice made for familiarity bought a permanent complication in the tokenizer.* That trade may still be right. But it should be made knowingly, and this is the kind of thing you can only see if you know where to look.

### 2.3 Context-free grammars in twenty minutes

A **context-free grammar** is four things: `G = (N, T, P, S)`.

- `N` — a finite set of **nonterminals**: the names of the phrases (`expr`, `stmt`, `type`). By convention, lowercase here.
- `T` — a finite set of **terminals**: the tokens. Disjoint from `N`.
- `P` — a finite set of **productions**, each of the form `A → α` where `A ∈ N` and `α` is a (possibly empty) sequence drawn from `N ∪ T`.
- `S ∈ N` — the **start symbol**.

"Context-free" means the left side of every production is *exactly one* nonterminal. You may replace `A` by `α` no matter what surrounds `A`. That restriction is precisely what makes efficient parsing possible, and it is also why type checking is a separate pass — "this variable is in scope" is not context-free.

Here is the grammar that every textbook uses, and it will carry us the rest of the way:

```
expr   → expr "+" term
       | term
term   → term "*" factor
       | factor
factor → NUM
       | IDENT
       | "(" expr ")"
```

### 2.4 Derivations and parse trees

A **derivation** applies productions repeatedly, starting from `S`, until only terminals remain. For the input `1 + 2 * 3`:

```
expr  ⇒ expr "+" term
      ⇒ term "+" term
      ⇒ factor "+" term
      ⇒ 1 "+" term
      ⇒ 1 "+" term "*" factor
      ⇒ 1 "+" factor "*" factor
      ⇒ 1 "+" 2 "*" factor
      ⇒ 1 "+" 2 "*" 3
```

A **parse tree** is the same information with the ordering thrown away: nonterminals are internal nodes, terminals are leaves, and each node's children are the right-hand side of the production used.

```
          expr
        /  |   \
     expr  +   term
      |        / | \
     term   term * factor
      |       |      |
    factor  factor   3
      |       |
      1       2
```

Read the leaves left to right and you get the input back. The tree says `1 + (2 * 3)`, because `2 * 3` is a single subtree.

**This tree is the whole point.** The string `1 + 2 * 3` is flat; the tree has the meaning in it. Parsing is the recovery of that tree, and every question in this chapter is really the question *"does this string determine its tree?"*

### 2.5 Ambiguity: the central villain

> A grammar is **ambiguous** if some string in its language has more than one parse tree.

That is the definition. Here is why it matters: the tree is what you evaluate. Two trees means two meanings. An ambiguous grammar does not define a language so much as *fail to*.

**Classic example 1 — operator precedence.** Take the naive grammar:

```
expr → expr "+" expr
     | expr "*" expr
     | NUM
```

Now `1 + 2 * 3` has two parse trees:

```
      expr                    expr
    /  |   \                /  |   \
 expr  +   expr          expr  *   expr
  |        / | \        / | \       |
  1     expr * expr   expr + expr   3
          |     |       |     |
          2     3       1     2

    = 1 + (2 * 3) = 7      = (1 + 2) * 3 = 9
```

Same string. Different numbers. The grammar is silent on which is correct.

**Classic example 2 — the dangling else.** This one is subtler and it is *in almost every language you use*.

```
stmt → "if" expr "then" stmt
     | "if" expr "then" stmt "else" stmt
     | ...
```

Consider:

```
if a then if b then x else y
```

Two readings:

```
if a then (if b then x else y)      -- else binds to the INNER if
if a then (if b then x) else y      -- else binds to the OUTER if
```

If `a` is true and `b` is false, the first does nothing and the second runs `y`. Every mainstream language resolves this the same way — **else binds to the nearest unmatched if** — but notice that this rule is *not in the grammar above*. It is an extra-grammatical decree.

**Classic example 3 — the one you will actually hit.** Ambiguity between an expression and something else that starts the same way:

- `{` starting a block vs. starting a record/object literal (JavaScript's famous `{}` at statement position; Rust's restriction on struct literals in `if` conditions).
- `x[T]` — is that indexing `x` at `T`, or instantiating generic `x` with type `T`? Go hit this directly in its generics design.
- `(a, b)` — a tuple, or a parenthesized expression, or a parameter list for a lambda about to appear?

These are the ones that bite in a *new* language, because you are inventing the collisions yourself.

### 2.6 The bad news, stated honestly

**Ambiguity of a context-free grammar is undecidable.** There is no algorithm that takes an arbitrary CFG and tells you whether it is ambiguous. (Citation and provenance in §5.6 — this is a classical result and it is worth knowing it is a *theorem*, not a gap in the tooling.)

So you cannot, in general, push a button. What you can do is one of three things, and all three are used in practice:

1. **Work in a decidable subclass.** LL(1), LR(1), LALR(1) grammars are *by construction* unambiguous, and membership in those classes *is* decidable and cheap to check. You do not prove your grammar unambiguous; you prove it is LL(1), and unambiguity follows. **This is the move almost every serious language makes, and it is the one I would recommend to you.**
2. **Detect conservatively.** Tools that search for ambiguity and report "found one" or "found none up to depth k." Sound in one direction only.
3. **Resolve by decree.** Keep the ambiguous grammar and add disambiguation rules on the side — precedence, associativity, "prefer the longer match," "prefer the earlier rule." This is what yacc/bison do and what parser generators mean by "shift/reduce conflict resolved in favor of shift."

Option 3 works and ships enormous amounts of software. Its weakness is that the *language definition* is now the grammar plus a pile of tie-breaking rules, and the tie-breaking rules are where the surprises hide.

### 2.7 Killing ambiguity, technique one: stratify the grammar

Go back to the ambiguous expression grammar. The fix is the textbook grammar from §2.3, and it is worth seeing *why* it works.

```
expr   → expr "+" term | term        -- level 1: loosest
term   → term "*" factor | factor    -- level 2: tighter
factor → NUM | "(" expr ")"          -- level 3: atomic
```

One nonterminal per precedence level. Each level can only contain levels *below* it. A `term` can never directly contain a `+`, so `1 + 2` cannot be the left operand of `*` unless it is parenthesized (which sends you back to `expr` via `factor`). The precedence is *structurally enforced by the shape of the grammar*.

Associativity comes from which side recurses:

- `expr → expr "+" term` — recursion on the **left** makes `+` **left-associative**: `1+2+3` parses as `(1+2)+3`.
- `expr → term "+" expr` — recursion on the **right** makes `+` **right-associative**: `1+2+3` parses as `1+(2+3)`.

You want left for `-` and `/` (because `8-3-2` should be `3`, not `7`), right for `^` and `->`.

**The cost of stratification** is real: an expression grammar with 12 precedence levels needs 12 nonterminals, and parsing a simple `1` walks down all 12. That is verbose to write and slow to run. Which is why the technique in §2.8 exists.

### 2.8 Killing ambiguity, technique two: precedence declarations

Rather than encoding precedence in the grammar's *shape*, declare it as *data* alongside a compact grammar. This is what modern languages do, and it is what your parser will do.

The declaration is a table:

| Operator | Precedence | Associativity |
|---|---|---|
| `\|\|` | 1 | left |
| `&&` | 2 | left |
| `==` `!=` | 3 | left |
| `<` `>` `<=` `>=` | 4 | left |
| `+` `-` | 9 | left |
| `*` `/` `%` | 10 | left |

Here is the striking thing, and I want you to look at it directly. Three independent languages, and their tables are nearly identical.

**Concrete** (`C:\Users\kokok\Dev\foldlab\.reference\clones\concrete\Concrete\Frontend\Parser.lean:810-830`) — **VERIFIED by reading**:

```lean
partial def binOpPrec (tk : TokenKind) : Option (Nat × BinOp) :=
  match tk with
  | .or_ => some (1, .or_)
  | .and_ => some (2, .and_)
  | .eq => some (3, .eq)
  | .neq => some (3, .neq)
  | .lt => some (4, .lt)
  | .gt => some (4, .gt)
  | .leq => some (4, .leq)
  | .geq => some (4, .geq)
  | .pipe => some (5, .bitor)
  | .caret => some (6, .bitxor)
  | .ampersand => some (7, .bitand)
  | .shl => some (8, .shl)
  | .shr => some (8, .shr)
  | .plus => some (9, .add)
  | .minus => some (9, .sub)
  | .star => some (10, .mul)
  | .slash => some (10, .div)
  | .percent => some (10, .mod)
  | _ => none
```

**Unison** (`C:\Users\kokok\Dev\foldlab\.reference\clones\unison\parser-typechecker\src\Unison\Syntax\Precedence.hs:58-67`) — **VERIFIED by reading**:

```haskell
infixLevels :: [[Text]]
infixLevels =
  [ ["||", "|"],
    ["&&", "&"],
    ["==", "!==", "!=", "==="],
    ["<", ">", ">=", "<="],
    ["+", "-"],
    ["*", "/", "%"],
    ["^", "^^", "**"]
  ]
```

Same order, top to bottom: logical-or, logical-and, equality, comparison, additive, multiplicative. That ordering is inherited from C, and through C from mathematical convention, and your users have it in their fingers. **Deviating from it is possible but expensive** — it is one of the few places where "familiarity" is a genuinely strong argument, because the cost of being wrong is silent miscomputation rather than a compile error.

Note also Unison's refinement, which is a real improvement worth stealing: precedence is not a bare `Nat` but an *ordered data type* (`Precedence.hs:34-56`), with named levels `Basement | Bottom | Annotation | Statement | Control | InfixOp _ | Application | Prefix | Top` and an explicit `increment` function. You cannot typo a precedence into an unintended level, and the levels have names that say what they are for. For a language you are designing from scratch in a typed host, that is strictly better than magic numbers.

### 2.9 LL(1), FIRST/FOLLOW, and left-factoring

If you take option 1 from §2.6 — work in a decidable subclass — LL(1) is the friendliest one, and it is the one Concrete chose. Here is what it means.

**LL(1)** = scan **L**eft-to-right, produce a **L**eftmost derivation, with **1** token of lookahead. Operationally: *at every choice point, the single next token tells you which production to take.* No guessing, no backtracking, no "try this and rewind."

To check it mechanically you need two functions:

- **FIRST(α)** — the set of terminals that can begin a string derived from `α`. (Plus `ε` if `α` can derive the empty string.)
- **FOLLOW(A)** — the set of terminals that can appear immediately after `A` in some derivation.

The **LL(1) condition**: for each nonterminal `A` with productions `A → α₁ | α₂ | ... | αₙ`,

1. the `FIRST` sets of the alternatives are pairwise disjoint, and
2. if some `αᵢ` can derive `ε`, then `FIRST` of the others must be disjoint from `FOLLOW(A)`.

Condition 1 says "the next token picks the branch." Condition 2 handles optional things.

**When it fails, you left-factor.** If two alternatives share a prefix:

```
decl → "pub" "fn" IDENT ...
     | "pub" "struct" IDENT ...
```

seeing `pub` does not tell you which. Factor the common prefix into its own rule:

```
decl        → "pub" decl_after_pub
decl_after_pub → "fn" IDENT ...
               | "struct" IDENT ...
```

Now `pub` is consumed unconditionally, and the *next* token decides. This is a purely mechanical transformation and it is the single most useful grammar-repair technique you will learn.

Concrete's reference grammar is written in exactly this style. From `C:\Users\kokok\Dev\foldlab\.reference\clones\concrete\grammar\concrete.ebnf` — **VERIFIED by reading**:

```ebnf
(* The parser reads optional pub/trusted prefix, then dispatches    *)
(* on the keyword that follows.  Factored so each alt has a         *)
(* distinct first token.                                            *)
top_decl = '#' '[' attr_body ']'
         | 'pub' decl_after_pub
         | 'trusted' decl_after_trusted
         | decl_keyword
         ;

decl_after_pub = 'trusted' decl_after_trusted
               | decl_keyword
               ;

decl_after_trusted = decl_keyword ;
```

**And it is machine-checked.** I ran their checker on this machine — **VERIFIED, exit code 0**:

```
$ python scripts/check_ll1.py grammar/concrete.ebnf
Parsed 60 grammar rules from grammar\concrete.ebnf
LL(1) check passed: no FIRST/FIRST conflicts found.
EXIT=0
```

Sixty rules, checked in well under a second, in CI, on every change. **This is the single cheapest high-value thing in this entire document.** It is a few hundred lines of Python computing FIRST sets, and in exchange the language has a mechanically enforced guarantee that its grammar is unambiguous — the thing that §2.6 told you is undecidable in general.

Concrete is explicit that this is a *language design constraint*, not an implementation preference (`research/compiler/ll1-grammar.md:22`):

> "This is not just a parser implementation preference. It is a language-design constraint."

and (`ll1-grammar.md:19-20`):

> "every parse decision should be possible with one token of lookahead"
> "new features should be redesigned or rejected if they require parser cleverness"

They also keep an honest scope statement for what the checker does *not* buy — `research/compiler/external-ll1-checker.md:99-104`:

> This does **not** prove:
> - the production parser exactly matches the grammar
> - the parser is bug-free
> - the lexer/tokenization is formally verified

Hold onto that gap. It is exactly the gap that §5 is about.

**The honest cost of LL(1).** It forbids some syntax you might want. Left-recursive rules are out (`expr → expr "+" term` is illegal for LL, though the fix is mechanical and shown in §3.2). Constructs that need to see far ahead before committing are out. In exchange you get: one-token decisions, trivially good error messages ("expected one of `fn`, `struct`, `enum`; got `impl`"), fast parsing, and no ambiguity by construction. For a *scripting surface* aimed at humans and agents, that trade looks strongly favorable — the syntax you are forced to give up is mostly syntax that is hard to read anyway.

---

## 3. Parser technology

Four families, in rough order of how likely you are to use them.

### 3.1 Recursive descent

**The idea in one sentence: write one function per nonterminal.**

A grammar rule becomes a function; a nonterminal on the right becomes a call; a terminal becomes "consume this token or fail"; alternation becomes a `switch` on the lookahead token.

```
stmt → "if" expr block
     | "while" expr block
     | "return" expr ";"
```

becomes, near-mechanically:

```typescript
function parseStmt(): Stmt {
  switch (peek().kind) {
    case "if":     advance(); return { tag: "If", cond: parseExpr(), body: parseBlock() };
    case "while":  advance(); return { tag: "While", cond: parseExpr(), body: parseBlock() };
    case "return": advance(); const e = parseExpr(); expect(";"); return { tag: "Return", value: e };
    default: throw parseError("expected a statement", peek());
  }
}
```

That is the whole technique. It is unreasonably effective, and it is what nearly every production compiler you can name actually uses — GCC, Clang, Rust, Go, TypeScript, V8. The reasons are consistent:

- **Error messages.** You are writing the code, so you can say exactly what you expected and offer a fix. Generated parsers famously say "syntax error at line 42."
- **Debuggability.** It is a call stack. You can step through it.
- **Escape hatches.** When the language has one genuinely awkward corner, you write the awkward code in one place instead of contorting the whole grammar.

Concrete is a clean specimen. Its parser is 2,400+ lines of hand-written recursive descent in Lean, with the state threaded through a monad you will recognize immediately (`Parser.lean:28-40`):

```lean
structure ParserState where
  tokens : Array Token
  pos : Nat
  pendingGt : Bool := false
  loopContracts : List LoopContract := []
  errors : Diagnostics := []
  deriving Inhabited

abbrev ParseM := ExceptT Diagnostics (StateM ParserState)
```

`ExceptT Diagnostics (StateM ParserState)` — failure over mutable position. If you have written `Effect<A, ParseError, ParserState>`, you have written this type. The whole parser is `StateT` + `ExceptT` and nothing more exotic.

There is a subtle and genuinely instructive comment attached to that `errors` field (`Parser.lean:33-36`):

> "Lives in the threaded state (not a `mut` local) precisely because `ExceptT` rolls `mut` locals back on a throw but leaves the base `StateM` state intact."

That is a monad-transformer-order fact being used deliberately: they *want* accumulated errors to survive a throw, so the accumulator lives in the layer that a throw does not unwind. Effect users hit exactly this when choosing where state sits relative to error handling. Same problem, same fix.

### 3.2 The left-recursion problem, and the loop

Recursive descent has one hard failure mode. Take:

```
expr → expr "+" term | term
```

Transcribe it literally and `parseExpr` calls `parseExpr` as its first act, with no token consumed. Infinite loop, stack overflow. **Left recursion and recursive descent are incompatible.**

The mechanical fix is to rewrite left recursion as iteration. The rule `A → A α | β` generates `β` followed by zero or more `α`, so write it that way:

```
expr → term { "+" term }
```

and implement the `{ ... }` as a `while` loop:

```typescript
function parseExpr(): Expr {
  let lhs = parseTerm();
  while (peek().kind === "+") {
    advance();
    lhs = { tag: "Add", left: lhs, right: parseTerm() };   // fold LEFT
  }
  return lhs;
}
```

Notice the accumulation `lhs = Add(lhs, ...)` reassociates to the left, which recovers the left-associativity the original left-recursive rule expressed. To get right-associativity you recurse instead of looping.

This is why Concrete's EBNF uses `{ A }` repetition, and it is why the LL(1) restriction is less painful than it first sounds: the transformation is always available.

### 3.3 Pratt parsing (precedence climbing) — the workhorse

Now generalize that loop. §3.2 handled one precedence level. Stratifying into twelve levels means twelve functions, and every atom walks all twelve. Pratt parsing collapses them into **one function that takes the current precedence as a parameter**.

It was published by Vaughan Pratt in 1973 ("Top Down Operator Precedence", POPL '73). The variant shown here is usually called *precedence climbing*; the two are close enough that the names are used interchangeably. This is the algorithm in Clang, in Go's parser, in Rust's, and it is the one I would have you use for the scripting surface.

**The algorithm.**

```
parseExpr(minPrec):
    lhs ← parseAtom()                        # a literal, a name, a parenthesized expr
    loop:
        op ← peek()
        if op is not an infix operator: break
        (prec, build) ← table[op]
        if prec < minPrec: break             # ← the whole trick is this line
        consume(op)
        rhs ← parseExpr(prec + 1)            # +1 for left-assoc; prec for right-assoc
        lhs ← build(lhs, rhs)
    return lhs
```

Nine lines. It handles any number of precedence levels and both associativities.

**Why the `prec < minPrec` test works.** `minPrec` means *"I am only allowed to absorb operators at least this tight."* When you recurse to parse the right operand of an operator at precedence `p`, you pass `p + 1`. So an operator of the **same** precedence `p` hits `p < p + 1` — true — and *stops*, handing the operand back to the outer loop, which attaches it on the left. That is left-associativity, and it falls out of a single `+1`.

Pass `p` instead of `p + 1` and the same-precedence operator continues in the *inner* call, nesting to the right. That is right-associativity. **One character selects the associativity of an operator.** That is the elegance people mean when they praise this algorithm.

**A real implementation, compiled and checked.** I wrote this in Lean 4 and ran it — reproduced verbatim from the scratch file:

```lean
inductive Exp where
  | lit : Int → Exp
  | var : String → Exp
  | add : Exp → Exp → Exp
  | mul : Exp → Exp → Exp
  deriving Repr, DecidableEq, Inhabited

inductive Tok where
  | int : Int → Tok
  | ident : String → Tok
  | plus | star | lparen | rparen
  deriving Repr, DecidableEq, Inhabited

/-- The whole precedence table: one line per infix operator. -/
def infixPrec : Tok → Option (Nat × (Exp → Exp → Exp))
  | .plus => some (65, Exp.add)
  | .star => some (70, Exp.mul)
  | _     => none

mutual

def parseAtom (fuel : Nat) (ts : List Tok) : Option (Exp × List Tok) :=
  match fuel with
  | 0 => none
  | f + 1 =>
    match ts with
    | .int n   :: rest => some (.lit n, rest)
    | .ident s :: rest => some (.var s, rest)
    | .lparen  :: rest =>
        match parseExp f 0 rest with
        | some (e, .rparen :: rest') => some (e, rest')
        | _ => none
    | _ => none
termination_by fuel

def parseExp (fuel : Nat) (minPrec : Nat) (ts : List Tok) : Option (Exp × List Tok) :=
  match fuel with
  | 0 => none
  | f + 1 =>
    match parseAtom f ts with
    | none => none
    | some (lhs, rest) => parseLoop f minPrec lhs rest
termination_by fuel

def parseLoop (fuel : Nat) (minPrec : Nat) (lhs : Exp) (ts : List Tok)
    : Option (Exp × List Tok) :=
  match fuel with
  | 0 => none
  | f + 1 =>
    match ts with
    | [] => some (lhs, [])
    | t :: rest =>
      match infixPrec t with
      | none => some (lhs, t :: rest)
      | some (p, mk) =>
        if p < minPrec then some (lhs, t :: rest)
        else
          match parseExp f (p + 1) rest with
          | none => none
          | some (rhs, rest') => parseLoop f minPrec (mk lhs rhs) rest'
termination_by fuel

end

/-- Top-level: parse a whole token list, requiring full consumption. -/
def parse (ts : List Tok) : Option Exp :=
  match parseExp (ts.length + 1) 0 ts with
  | some (e, []) => some e
  | _ => none
```

**`[compiles]` — VERIFIED**, `lean Pratt.lean`, exit code 0.

Two notes on the Lean-specific parts, because they are not incidental:

- **The `fuel` parameter.** Lean requires every function to terminate, and a Pratt parser's recursion is not structural on the token list — `parseLoop` calls `parseExp` on a *suffix*, and Lean cannot see that this shrinks. Threading a `Nat` that decreases on every call makes termination obvious (`termination_by fuel`), at the cost of a `none` result if fuel runs out. `parse` supplies `ts.length + 1`, which is always enough. The alternative is `partial def`, which compiles but produces a function you cannot reason about in proofs — a bad trade if §5 is anywhere in your future.
- **`termination_by` goes inside the `mutual` block**, attached to each definition. Putting a combined `termination_by` after `end` is a syntax error on v4.33.1 (`unexpected token 'termination_by'; expected command`) — I hit this and fixed it, so you do not have to.

**The trace.** Follow `1 + 2 * 3`:

| Call | `minPrec` | Sees | Test | Action |
|---|---|---|---|---|
| `parseExp 0` | 0 | `1` | — | atom `lit 1`; enter loop |
| `parseLoop 0` | 0 | `+` (p=65) | `65 < 0`? no | consume; recurse at `66` |
| `parseExp 66` | 66 | `2` | — | atom `lit 2`; enter loop |
| `parseLoop 66` | 66 | `*` (p=70) | `70 < 66`? no | consume; recurse at `71` |
| `parseExp 71` | 71 | `3` | — | atom `lit 3`; no more input |
| ← returns | | | | `mul 2 3` |
| ← returns | | | | `add 1 (mul 2 3)` |

And `1 + 2 + 3`, where the `+1` earns its keep:

| Call | `minPrec` | Sees | Test | Action |
|---|---|---|---|---|
| `parseExp 0` | 0 | `1` | — | atom; loop |
| `parseLoop 0` | 0 | `+` (p=65) | `65 < 0`? no | recurse at `66` |
| `parseExp 66` | 66 | `2` | — | atom; loop |
| `parseLoop 66` | 66 | `+` (p=65) | **`65 < 66`? YES** | **stop**, return `lit 2` |
| ← back in outer loop | 0 | | | `lhs := add 1 2` |
| `parseLoop 0` | 0 | `+` (p=65) | `65 < 0`? no | recurse at `66` → `lit 3` |
| ← returns | | | | `add (add 1 2) 3` — **left-assoc** |

The bolded row *is* left-associativity. There is nothing else to it.

**Checked, not just argued** — these `#guard`s are in the compiled file and all pass:

```lean
#guard parse [.int 1, .plus, .int 2, .star, .int 3]
       == some (.add (.lit 1) (.mul (.lit 2) (.lit 3)))

#guard parse [.lparen, .int 1, .plus, .int 2, .rparen, .star, .int 3]
       == some (.mul (.add (.lit 1) (.lit 2)) (.lit 3))

#guard parse [.int 1, .plus, .int 2, .plus, .int 3]
       == some (.add (.add (.lit 1) (.lit 2)) (.lit 3))
```

**And here is Concrete's version of the same nine lines** (`Parser.lean:832-847`), so you can see that the production code and the teaching code are the same algorithm:

```lean
partial def parseExprPrec (minPrec : Nat) : ParseM Expr := do
  let mut lhs ← parsePrimary >>= parsePostfix
  let mut tk ← peek
  while true do
    match binOpPrec tk with
    | some (prec, op) =>
      if prec < minPrec then break
      advance
      let rhs ← parseExprPrec (prec + 1)
      lhs := .binOp lhs.getSpan op lhs rhs
      tk ← peek
    | none => break
  return lhs

partial def parseExpr : ParseM Expr :=
  parseExprPrec 0
```

Identical structure: `prec < minPrec → break`, recurse at `prec + 1`, fold left. A whole production language's expression grammar — eighteen operators, ten precedence levels — is that loop plus the table in §2.8. **Note that `prec + 1` is unconditional there, so every binary operator in Concrete is left-associative.** That is a language design decision, silently encoded in one character, and it is the kind of thing worth writing down in your own design doc rather than leaving in the parser.

### 3.4 Parser combinators

A parser combinator library makes parsers **values** that you compose, rather than functions you write.

The core type, in the shape you already think in:

```typescript
type Parser<A> = (input: Input) => Result<[A, Input], ParseError>
```

which is precisely `StateT<Input, Either<ParseError, _>>` — the same stack as Concrete's `ExceptT Diagnostics (StateM ParserState)`, but exposed as a composable value with a `Monad` instance. Then:

- `map` — transform the result
- `flatMap` — sequence, with the second parser depending on the first
- `orElse` / `<|>` — try the left; on failure try the right
- `many` / `many1` — repetition
- `sepBy` — separated lists

and the grammar becomes an expression:

```typescript
const expr = pipe(
  term,
  flatMap(lhs => many(pipe(symbol("+"), zipRight(term)))),
  map(([lhs, rest]) => rest.reduce(Add, lhs))
)
```

**The appeal for you specifically** is that this is ordinary Effect-shaped programming. You get the host language's abstraction facilities for free — a `sepBy` you write once works everywhere, and the grammar is typed.

**The costs, honestly:**

- **Backtracking semantics are a trap.** `p <|> q` — if `p` consumed three tokens and *then* failed, does `q` start from the beginning or from token three? Both designs exist. Parsec's answer (fail without consuming = try `q`; fail after consuming = propagate the error, unless wrapped in `try`) is efficient but is the single largest source of confusing bugs for newcomers. Unlimited backtracking is easier to reason about and can be exponential.
- **Error messages need deliberate work.** The default is "expected one of [47 things] at offset 231."
- **Left recursion still kills you**, in the same way and for the same reason as §3.2, and now the infinite loop is inside a library.

**In Lean 4 specifically**, the landscape is covered in §4.3.

### 3.5 Generated parsers

You write the grammar in a declarative file; a tool generates the parser.

| Tool | Class | Notes |
|---|---|---|
| yacc / bison | LALR(1) | The classic. Conflicts reported as "shift/reduce," which takes practice to read. |
| Menhir (OCaml) | LR(1) | Excellent errors for a generator; **has a `--coq` mode emitting a Coq-verified parser** (see §5.3). |
| ANTLR | ALL(*) | Adaptive lookahead; very permissive about grammar shape. |
| tree-sitter | GLR | Incremental and error-tolerant by design. Built for editors, and the reason your syntax highlighting survives a half-typed line. |

**The real argument for a generator** is not the parser it emits — it is that *the grammar file exists as an artifact*. It is checkable, diffable, publishable, and it can be the specification other tools read.

**The real argument against** is error message quality and the difficulty of handling one weird corner.

**Which is why the strongest configuration is both**, and this is Concrete's setup and my recommendation to you. From `research/compiler/external-ll1-checker.md:70-81` — **VERIFIED by reading**:

> The intended model is:
> 1. production compiler uses the hand-written lexer/parser
> 2. reference grammar describes the same intended language
> 3. external checker proves the grammar remains LL(1)
>
> This means the project can keep:
> - a hand-written parser optimized for good diagnostics and direct control
> - an independent grammar guardrail to stop syntax drift

Hand-written parser for the errors and the control. Declarative grammar as the spec. A cheap checker in CI enforcing that the spec stays in the good class. The residual risk — that the parser and the grammar drift apart — is real and unaddressed by this setup, and §5 is about closing exactly that gap.

### 3.6 Error recovery, and why scripting languages need it

Everything above assumes the input is valid. Most of the time it is not — during editing, *every* keystroke is a syntax error.

A parser that stops at the first error is nearly useless in an editor: fix one typo, get the next error, repeat. You want **all** the errors, and you want the tooling (completion, highlighting, go-to-definition) to keep working on the parts of the file that are fine.

Standard techniques:

- **Panic-mode recovery**: on error, discard tokens until you reach a *synchronizing token* — `;`, `}`, or a declaration keyword — then resume. Crude, effective, about twenty lines.
- **Phrase-level recovery**: guess a local repair ("you probably meant to insert `;`") and continue as if it were there.
- **Error productions**: put common mistakes *in the grammar* as explicitly-recognized wrong forms, with a good message attached. This is how you get "did you mean `==` instead of `=`?"
- **Error nodes in the tree**: parse into a tree that has an `Error` constructor, so downstream passes get a complete-shaped tree with holes. This is tree-sitter's model and it is why editors adopted it.

Concrete does panic-mode at declaration granularity, and the design note explains the reasoning (`Parser.lean:33-36`): recovered top-level errors are collected "so one bad declaration does not hide the rest," with the accumulator deliberately placed in the `StateM` layer so a throw does not roll it back.

**Why this matters more for a scripting surface than for a core language.** Your spine is a content-addressed core — mostly machine-produced, mostly already well-formed. The scripting surface is the opposite: typed by humans and by agents, incrementally, wrongly, constantly. An agent writing a script gets exactly one signal about what it did wrong, and that signal is your error message. Error quality is not polish there; it is the interface.

Two rules that pay for themselves:

1. **Every token carries a source span.** Concrete's `Token` is `{ kind, span }` with `Span = { line, col, endLine, endCol }` (`Token.lean:45-55`), and every AST node carries a span too. You cannot retrofit this — the moment you want to underline the offending text, you need spans everywhere, and adding them later is a large mechanical edit.
2. **Errors are data, not strings.** Concrete's parse failures are `Diagnostic` records with `severity`, `message`, `pass`, `span`, `hint`, and a stable `code` (`Parser.lean:44-45`). A structured error can be rendered for a terminal, an LSP client, or a JSON API. A string can only be printed.

---

## 4. Parsing in Lean 4

This chapter is reconnaissance, run on your machine, not folklore. Toolchain:

```
$ lean --version
Lean (version 4.33.1, x86_64-w64-windows-gnu,
      commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6, Release)
```

### 4.1 Lean's own extensible parser: programs that define syntax

Here is the thing that makes Lean unusual among proof assistants, and unusually interesting for you: **Lean's parser is not fixed.** It is a data structure in the environment, and Lean programs extend it. `notation`, `infixl`, `do`-notation, even `theorem` — these are not built into a fixed grammar; they are declarations that add parser rules. When you write a `syntax` command, you are doing the same thing the standard library does.

The pieces:

| Command | What it does |
|---|---|
| `declare_syntax_cat c` | Creates a brand-new syntactic category `c` — a fresh nonterminal |
| `syntax:prec ... : c` | Adds a production to category `c`, at precedence `prec` |
| `macro_rules \| \`(pat) => \`(expansion)` | Rewrites surface syntax into other syntax |
| `macro` | Sugar for `syntax` + `macro_rules` together |
| `elab` | For when a macro is not enough and you need to build the term yourself |
| `notation` / `infixl` / `infixr` | Convenience wrappers for the common operator cases |

**A complete worked DSL.** This is the whole file, compiled on v4.33.1:

```lean
inductive Exp where
  | lit : Int → Exp
  | var : String → Exp
  | add : Exp → Exp → Exp
  | mul : Exp → Exp → Exp
  deriving Repr, DecidableEq

declare_syntax_cat exp

syntax num   : exp
syntax ident : exp
syntax:65 exp:65 " + " exp:66 : exp
syntax:70 exp:70 " * " exp:71 : exp
syntax "(" exp ")" : exp

syntax "[exp|" exp "]" : term

macro_rules
  | `([exp| $n:num])   => `(Exp.lit $n)
  | `([exp| $x:ident]) => `(Exp.var $(Lean.quote x.getId.toString))
  | `([exp| $a + $b])  => `(Exp.add [exp| $a] [exp| $b])
  | `([exp| $a * $b])  => `(Exp.mul [exp| $a] [exp| $b])
  | `([exp| ($a)])     => `([exp| $a])
```

**`[compiles]` — VERIFIED**, `lean Dsl.lean`, exit code 0.

Read the two operator lines closely, because they encode everything from §2.8 in one line each:

```lean
syntax:65 exp:65 " + " exp:66 : exp
--     ↑      ↑            ↑     ↑
--     │      │            │     └── this production belongs to category `exp`
--     │      │            └──────── right operand must be at level ≥ 66
--     │      └───────────────────── left operand may be at level ≥ 65
--     └──────────────────────────── the production itself sits at level 65
```

Left operand admitted at the *same* level (65), right operand required to be *tighter* (66). That asymmetry is left-associativity, and it is the identical `+1` trick from §3.3 — the same idea expressed declaratively instead of operationally. Swap them (`exp:66 " + " exp:65`) and `+` becomes right-associative.

And `*` sits at 70/71, above `+`'s 65/66, so `*` binds tighter.

**The proof that it works** — these are `example ... := rfl`, so Lean checks them by computation at compile time. If precedence were wrong, the file would not compile:

```lean
-- Precedence: * binds tighter than +
example : [exp| 1 + 2 * 3] = Exp.add (Exp.lit 1) (Exp.mul (Exp.lit 2) (Exp.lit 3)) := rfl

-- Associativity: + is left-associative
example : [exp| 1 + 2 + 3] = Exp.add (Exp.add (Exp.lit 1) (Exp.lit 2)) (Exp.lit 3) := rfl

-- Parens override
example : [exp| (1 + 2) * 3] = Exp.mul (Exp.add (Exp.lit 1) (Exp.lit 2)) (Exp.lit 3) := rfl

-- Variables
example : [exp| x * y + 1] = Exp.add (Exp.mul (Exp.var "x") (Exp.var "y")) (Exp.lit 1) := rfl
```

All four discharge by `rfl`. **VERIFIED** — this is a machine-checked statement that your surface syntax means what you claim it means, and it costs one line per claim. Keep this technique. It is the cheapest possible regression test for a grammar, and it lives right next to the syntax it tests.

**What is actually happening**, because the mechanism is worth understanding rather than copying:

1. `declare_syntax_cat exp` adds a new nonterminal to Lean's parser tables at elaboration time.
2. Each `syntax` command adds a production, with its precedence, to that category.
3. `syntax "[exp|" exp "]" : term` builds a bridge: wherever a *term* is expected, `[exp| ... ]` is now legal, and its contents are parsed in the `exp` category. This is the standard "quotation" pattern for embedding a DSL.
4. `macro_rules` pattern-matches on the resulting `Syntax` tree and rewrites it. The backtick-paren `` `(...) `` is quasiquotation: `` `(Exp.add ...) `` *constructs* syntax, and `$x` splices.
5. `$(Lean.quote x.getId.toString)` is the escape into computation: `x` is an `ident` node, `x.getId.toString` is a Lean `String`, and `Lean.quote` lifts that value back into syntax. This is how you get from "the user wrote `foo`" to `Exp.var "foo"`.

Note that steps 1–4 are exactly the pipeline from §2 — category, productions with precedence, tree, tree-to-tree transformation — but the *host language provides the parser generator*. You do not write a lexer or a parser. You write productions and rewrites.

**The macro-expansion step is the abstract-syntax boundary.** Before `macro_rules`, you have `Syntax` — Lean's concrete syntax tree, which retains source positions and the literal tokens. After, you have `Exp` — your abstract syntax, which retains only structure. That transition is precisely the concrete/abstract distinction, and Lean makes it a visible, programmable step rather than an implicit one.

### 4.2 Ambiguity, as Lean reports it

§2.5 claimed ambiguity is the central villain. Lean will tell you when you have created one. I wrote a deliberately ambiguous notation:

```lean
notation:65 a " ⊕ " b => Nat.add a b
notation:65 a " ⊕ " b => Nat.mul a b

#eval (2 ⊕ 3 : Nat)
```

and the compiler said — **VERIFIED**, exit code 1:

```
Amb.lean:6:7: error: Ambiguous term
  2 ⊕ 3
Possible interpretations:
  2 ⊕ 3 : Nat

  2 ⊕ 3 : Nat
```

Two productions, same token, same precedence, no way to choose. Lean parses *both*, notices the result is ambiguous, and refuses.

This is worth dwelling on because of *how* Lean handles it. Lean's parser is effectively a longest-match Pratt parser over a dynamically extensible table, and when several productions match it keeps all the alternatives and lets the *elaborator* pick — usually by type. That is why `2 ⊕ 3` above fails: both alternatives elaborate successfully at type `Nat`, so there is a genuine tie. Had one been `Nat` and one `String`, the expected type would have resolved it silently.

**The design lesson**: Lean deliberately tolerates local syntactic ambiguity and resolves it *semantically*, downstream. That is a legitimate and powerful choice — it is what lets `+` work on every numeric type — but note it is the opposite of Concrete's choice in §2.9, and the two choices suit different goals. Lean is a language for mathematicians who want notation to be overloadable. Concrete is a language whose thesis is auditability. **If your scripting surface's job is to be predictable for humans and agents, you want the Concrete discipline, not the Lean one.** Syntax that means different things depending on inferred types is exactly the sort of thing that makes an agent's generated code fail in ways it cannot diagnose.

### 4.3 Parser libraries in the Lean 4 ecosystem

Surveyed August 2026. The short version: **there is no mature verified parser for Lean 4**, and the practical options are a core library with no stability guarantee and one healthy third-party combinator package.

**In core: `Std.Internal.Parsec`.** I confirmed the module path and behavior first-hand — **VERIFIED**, exit code 0:

```lean
import Std.Internal.Parsec
import Std.Internal.Parsec.String
open Std.Internal.Parsec Std.Internal.Parsec.String

def nat1 : Parser String := many1Chars digit

#eval Std.Internal.Parsec.String.Parser.run nat1 "123"
#eval Std.Internal.Parsec.String.Parser.run nat1 "abc"
```
```
Except.ok "123"
Except.error "offset 0: digit expected"
EXIT=0
```

Also confirmed first-hand: **`Lean.Parsec` no longer exists** on v4.33.1 —

```
error(lean.unknownIdentifier): Unknown identifier `Lean.Parsec`
```

If you find a tutorial importing `Lean.Data.Parsec` or opening `Lean.Parsec`, it predates Lean 4.12, where parsec moved and was generalized beyond `String` to any iterable input (release notes: <https://lean-lang.org/doc/reference/latest/releases/v4.12.0/>). API docs: <https://lean-lang.org/doc/api/Std/Internal/Parsec.html>.

**Two warnings about it.** First, the namespace says `Internal`. There is no stability contract; it can change between releases. Second, look at that error message — `"offset 0: digit expected"`. Byte offset, no line, no column, no context, no hint. Compare to Concrete's structured `Diagnostic`. This is §3.4's warning made concrete: combinator libraries give you composition cheaply and good errors not at all.

**Third-party**, with liveness as of the survey:

| Package | What | Status |
|---|---|---|
| [`fgdorais/lean4-parser`](https://github.com/fgdorais/lean4-parser) | General parser combinators, Apache-2.0 | **The healthiest option.** ~90★, pushed 2026-08-22, tracks v4.34.0-rc2. Docs: <https://www.dorais.org/lean4-parser/doc/> |
| [`janmasrovira/prim-parser`](https://github.com/janmasrovira/prim-parser) | Total combinators; termination enforced by a *graded* monad | **Most interesting for a verification program.** Pushed 2026-08-24, depends on Mathlib for the lattice structure. Very young. Write-up: <https://blog.janmasrovira.org/blog/prim-parser/> |
| [`leanprover/lean4-cli`](https://github.com/leanprover/lean4-cli) | Command-line argument parsing, MIT | Live, first-party. Not a general parser library. |
| [`tydeu/lean4-partax`](https://github.com/tydeu/lean4-partax) | Compiles *Lean grammars* into standalone parsers | Stale — builds only to Lean v4.5.0. Interesting idea, unmaintained. |
| [`argumentcomputer/Megaparsec.lean`](https://github.com/argumentcomputer/Megaparsec.lean) | Megaparsec port | **Dead.** No code push since Jan 2024, pinned to Lean v4.0.0. Not archived, so it looks alive at a glance. It is not. |

**On the verified side**, and this is the honest picture:

- [`haskell-spec/veriflex`](https://github.com/haskell-spec/veriflex) — verified lexer via Brzozowski derivatives, following the *Verbatim* line of work. Notably honest in its own README: the derivatives are fully verified; the maximal-munch lexer on top "works, but not yet verified relative to its spec." Dormant ~7 months.
- [`bergmannjg/lean4-parser-lemmas`](https://github.com/bergmannjg/lean4-parser-lemmas) — proof lemmas about `fgdorais/lean4-parser`. The only live artifact bridging a usable Lean parser to proofs about it. Also 2★, which tells you how much company this work has.
- [`nasa-jpl/L4YAML`](https://github.com/nasa-jpl/L4YAML) — advertises a "machine-verified" YAML 1.2.2 parser. **Treat the claim as unsubstantiated.** A code search reports on the order of 146 of its ~608 Lean files matching `sorry` and 155 matching `axiom`. File-level code search matches comments and strings too, so this is a signal rather than a verdict — but the gap between the README's language and that signal is wide enough that the claim needs a local `lake build` plus a `#print axioms` audit before anyone repeats it. *This is a good example of why "formally verified" in a README is not evidence.*

**Recommendation.** For a Lean-side parser today: hand-written recursive descent over your own token type, as Concrete does. You get the error quality, you avoid depending on an `Internal` namespace or a young package, and — the decisive reason — a hand-written parser with `termination_by` is a *total, reasoned-about function*, which is the precondition for anything in §5. If you want combinators, `fgdorais/lean4-parser` is the one to look at.

### 4.4 What Concrete actually did

Concrete is the most useful reference you have, because it is a real language, hosted in Lean 4, with verification ambitions similar to yours. Here is its frontend, as read from the clone at `C:\Users\kokok\Dev\foldlab\.reference\clones\concrete`.

**The architecture:**

| Component | Path (under the clone root) | Size | Approach |
|---|---|---|---|
| Token type | `Concrete/Frontend/Token.lean` | 3.5 KB | Flat `inductive TokenKind` + `Span` + `Token` |
| Lexer | `Concrete/Frontend/Lexer.lean` | 15 KB | Hand-written, character-level |
| Parser | `Concrete/Frontend/Parser.lean` | 94 KB | Hand-written recursive descent, strictly LL(1) |
| Pretty-printer | `Concrete/Frontend/Format.lean` | 23 KB | AST → source text |
| Reference grammar | `grammar/concrete.ebnf` | 16 KB | 60 rules, EBNF, the spec |
| LL(1) checker | `scripts/check_ll1.py` (+ `.c`, `.rs`) | 11 KB | FIRST/FOLLOW conflict detection, in CI |

**No parser combinators, no parser generator, no macro DSL.** Everything by hand, in plain Lean, over an explicit token array. The parser's module docstring states the discipline up front (`Parser.lean:7-24`):

```
# Parser — Strictly LL(1)

Every parse decision is made with one token of lookahead. No save/restore
backtracking. Key design points:
...
New syntax must satisfy the LL(1) invariant. See `research/compiler/ll1-grammar.md`.
```

**The detail I find most instructive** is their list of previously-non-LL(1) sites and how each was fixed, from `research/compiler/ll1-grammar.md:50-58`. This is a catalogue of the exact collisions a new language runs into:

> 1. **Top-level `mod` handling** — left-factored: `mod name` consumed once, then `{` vs `;` decides.
> 2. **Method receiver parsing** — `&` commits in method-parameter position; must be `&self` or `&mut self`.
> 3. **Type turbofish** — `::` in type position commits; `<` is required after `::`.
> 4. **Expression-level `name::...`** — `::` commits; must be `<` (turbofish) or ident (module path).
> 5. **Enum-dot fallback** — moved to `parsePostfix`; decided by uppercase check after `.field` consumed.

Three techniques recur there and they are the three you will need:

- **Left-factoring** (#1) — consume the shared prefix, then branch. §2.9.
- **Committing** (#2, #3, #4) — once you see a marker token, *commit* to one interpretation and make anything else an error. This converts a would-be ambiguity into a good error message. `&` in parameter position must be a self-receiver; if it is not, you say so, rather than backtracking.
- **Deferring to a later phase** (#5) — parse the general shape, decide the specific case afterwards.

Note #5's tell: "decided by uppercase check." Concrete uses *identifier casing* to distinguish a type from a value — `Type::Variant` vs `mod::name`. That is a real technique (Haskell and OCaml both do it) and it buys LL(1)-ness for qualified paths. It also means capitalization is load-bearing syntax, which must then be documented as a language rule rather than a style preference. **Every disambiguation you win is paid for somewhere in the user-facing language.**

**The three-language checker.** `scripts/` contains `check_ll1.py`, `check_ll1.c`, *and* `check_ll1.rs` — three independent implementations of the same FIRST/FOLLOW analysis. That is differential testing applied to the guardrail itself: if the three disagree about your grammar, one of them is wrong. For a property this cheap to compute and this load-bearing, that is a proportionate amount of paranoia.

**The pretty-printer, and a genuine finding.** `Format.lean` reprints a parsed AST. Its binary-operator case is (`Format.lean:139`):

```lean
| .binOp _ op lhs rhs => s!"{fmtExprAt ind lhs} {binOpToStr op} {fmtExprAt ind rhs}"
```

**There is no precedence-aware parenthesization here.** Compare my Lean printer in §3.3, which threads an ambient precedence and inserts parens when needed, and Unison's, which does the same. Concrete's does not — and it does not need to, because of a deliberate choice in the AST (`AST.lean:163`):

```lean
| paren (span : Span) (inner : Expr)
```

**The AST has an explicit `paren` node, and the parser builds one whenever it sees parentheses** (`Parser.lean:573-576`):

```lean
    advance
    let inner ← parseExpr
    expect .rparen
    return .paren sp inner
```

So the "abstract" syntax tree is not fully abstract: it retains the user's parentheses. The printer then reprints them verbatim, and roundtripping is trivially preserved.

This is a real design decision with a real trade-off, and I want to be precise about both halves:

- **What it buys:** the formatter is obviously correct, and it preserves the author's grouping (`(a + b) + c` stays written that way, which programmers often intend for readability). Roundtrip on parser output is nearly free.
- **What it costs:** the AST is no longer canonical. `a + b` and `(a + b)` are *different trees* that mean the same thing, so every downstream pass — type checking, evaluation, hashing — must either skip `paren` nodes or risk treating them as distinct. And crucially, **the printer is only roundtrip-safe on trees the parser produced.** Hand-build `.binOp .mul (.binOp .add x y) z` with no `paren` node and it prints as `x + y * z`, which reparses as `.binOp .add x (.binOp .mul y z)` — a different tree.

Hold onto that last sentence. It is the exact shape of the theorem in §5.

**This matters directly for your spine.** If your core is content-addressed, the hash *is* the identity of a term. A `paren` node that carries no meaning but changes the tree would change the hash — so `a + b` and `(a + b)` would be different content addresses for the same program. That is almost certainly not what you want. Which pushes you toward the other design: **a canonical AST with no `paren` node, and a precedence-aware printer that reinserts parentheses from the precedence table** — the §3.3 approach. You pay with a slightly cleverer printer, and you buy back a canonical core.

Unison, which is content-addressed, made exactly that choice. Its printer threads an ambient precedence (`parser-typechecker/src/Unison/Syntax/TermPrinter.hs:100-104`):

```haskell
data AmbientContext = AmbientContext
  { -- The operator precedence of the enclosing context (a number from 0 to 11,
    -- or -1 to render without outer parentheses unconditionally).
    -- Function application has precedence 10.
    precedence :: !Precedence,
```

Same technique as the toy printer in §3.3, at production scale in a 104 KB module. **When the AST is the canonical artifact, the printer must compute parentheses rather than remember them.**

---

## 5. Verified syntax: what can be proved, and what it costs

Now the question your program actually cares about. You have a parser and a printer. What can you *prove* about them, what does each proof cost, and where is the line between research and engineering?

I will start with the spectrum of available theorems, then the literature, then the cost — and the cost section contains the most useful number in this document.

### 5.1 The spectrum of theorems

These are ordered from cheapest to most expensive. Assume `parse : List Tok → Option Exp` and `print : Exp → List Tok`.

**(T0) Totality / non-crash.** `parse` is a total function: it terminates on every input and never panics.

```lean
-- In Lean this is not a theorem you state; it is a condition you satisfy
-- by writing `def` with `termination_by` rather than `partial def`.
```

*Cost: free, if you pay it up front.* This is why the §3.3 parser threads `fuel`. In a language without totality checking it is a genuine theorem and a hard one; in Lean it is a discipline. **The catch is that it is only free if you never write `partial def`** — retrofitting totality onto an existing `partial` parser means restructuring the recursion, which is real work.

**(T1) Roundtrip on the parser's image.** Anything the parser accepts, the printer reprints to something that parses back to the same tree.

```lean
theorem print_parse_stable (ts : List Tok) (e : Exp) (h : parse ts = some e) :
    parse (print e) = some e
```

*This is the minimal worthwhile verified-syntax result*, and I will argue for it in §5.2.

**(T2) Print-parse identity.** Printing *any* AST and reparsing recovers it exactly.

```lean
theorem parse_print (e : Exp) : parse (print e) = some e
```

Strictly stronger than T1: it quantifies over all trees, including ones no parser produced. For a content-addressed core with programmatic term construction, T2 is the one you want.

**(T3) Printer injectivity.** Distinct trees print to distinct token sequences.

```lean
theorem print_injective (e₁ e₂ : Exp) (h : print e₁ = print e₂) : e₁ = e₂
```

Follows immediately from T2 (apply `parse` to both sides). Worth naming separately because it is what says your rendering does not conflate two programs — a property a content-addressed system cares about directly.

**(T4) Parse determinism / unambiguity of the implementation.** `parse` returns at most one tree per input. In a functional implementation returning `Option Exp` this is *free by typing* — a function cannot return two answers. Note how much that simple choice buys: a parser that returns `List Exp` (as GLR parsers and Lean's own parser effectively do) has to prove the list has length ≤ 1; a parser that returns `Option` has it definitionally.

**(T5) Parser ⊨ grammar.** The hand-written parser accepts exactly the language of the reference grammar.

```lean
theorem parser_sound (ts : List Tok) (e : Exp) :
    parse ts = some e → Derives grammar exp ts
theorem parser_complete (ts : List Tok) :
    Derives grammar exp ts → ∃ e, parse ts = some e
```

This closes the gap Concrete names and does not close (§3.5). It requires formalizing derivation for your grammar as an inductive relation, then proving your hand-written code implements it. **This is the expensive one**, and it is where the published research lives.

**(T6) Grammar unambiguity.** Every string in the language has exactly one derivation. Undecidable in general (§2.6, and §5.6 for the citation). Provable for *specific* grammars, and obtained for free if you instead prove the grammar is LL(1) — which is the move to make.

**(T7) Verified lexer.** Maximal munch is correct: the token sequence produced is the one the lexical specification demands. Rarely done, and §4.3 shows the one Lean attempt has it unfinished.

### 5.2 The minimal worthwhile result

If you do exactly one thing, do **T1 or T2 for the expression fragment**.

The argument:

1. **It is the property whose violation is silent.** A parser bug throws an error you notice. A printer/parser disagreement produces a *different program that still compiles*. `1 + (2 + 3)` printed as `1 + 2 + 3` is a wrong answer, not a crash. In a content-addressed system it is worse: it is a different hash for what should be the same term, or the same hash rendering as two different texts.
2. **It is where the bug actually lives.** The precedence table is consulted from two directions (§6 step 5). Every operator you add, every precedence you tweak, is a chance for the two directions to disagree. This is a live, recurring bug class, not a hypothetical.
3. **It is small.** Restricted to the expression grammar — the operators, the atoms, the parenthesization — the induction is over a four-to-ten constructor datatype with a generalized statement about ambient precedence. That is days of work, not months.
4. **It composes with cheap sampling.** Property-testing `parse ∘ print = some` over random ASTs finds the same bugs for an afternoon's effort, and gives you the counterexamples that make the proof tractable. Do the testing first; it tells you whether the theorem is even true before you try to prove it.

**What NOT to attempt**: T5 (parser ⊨ grammar) and T7 (verified lexer) for a language you are still designing. The grammar will change weekly. Proof effort spent against a moving grammar is thrown away, and — more importantly — it will make you reluctant to change the grammar, which is exactly backwards while you are still designing.

**The rule of thumb**: *prove the things that stay true when the grammar changes.* T1/T2 are stated against whatever the current tables are, and re-proving them after a grammar change is mostly re-running a tactic. T5 has to be rewritten from scratch.

### 5.3 The literature, organized by lineage

Verified parsing is a real subfield with about fifteen years of results. It divides into four lineages, and knowing which lineage a paper belongs to tells you most of what you need.

PDFs marked **[local]** were downloaded to `C:\Users\kokok\Dev\foldlab\.reference\papers\` with the SHA-256 recorded; the rest are cited by URL only.

#### Lineage A — Certify the parser generator's output (the CompCert line)

The insight: do not verify the parser generator. Let the untrusted generator emit a parser, then run a *verified validator* that checks the emitted automaton against the grammar. If validation passes, the parser is correct; if it fails, you reject. This decouples proof effort from the (large, optimized, evolving) generator.

- **Jourdan, Pottier & Leroy, "Validating LR(1) Parsers"**, ESOP 2012. No arXiv. PDF: <https://xavierleroy.org/publi/validated-parser.pdf>
  **[local]** `jourdan-pottier-leroy-2012-validating-lr1-parsers.pdf`, 525,789 bytes, sha256 `12c960e08f7b52357ec2cbf107dba5357e3bf192a165ec20492a9eb7eeda2b11` — already in the papers directory; page-1 text confirms authors and abstract. This is the paper behind Menhir's `--coq` mode and CompCert's C parser.
- **Jourdan & Pottier, "A Simple, Possibly Correct LR Parser for C11"**, TOPLAS 39(4):14, 2017. <http://gallium.inria.fr/~fpottier/publis/jourdan-fpottier-2016.pdf>

**Why this lineage matters to you:** it is the only one that has shipped inside a widely used verified compiler. Its cost model — validate rather than verify — is a genuinely reusable idea, and it is the same idea as Concrete's external LL(1) checker: *do not prove the tool correct; check the tool's output.*

#### Lineage B — Verify the parser itself (Coq/PVS parser generators)

- **Koprowski & Binsztok, "TRX: A Formally Verified Parser Interpreter"**, ESOP 2010 / LMCS 7(2:18) 2011. **arXiv:1105.2576**. <https://arxiv.org/pdf/1105.2576>
  **[local]** `koprowski-binsztok-2011-trx-verified-parser-interpreter.pdf`, 311,596 bytes, sha256 `2c1207556ef8fdece9863229073735fff84aae15b72b84ec504f79d2f0e0fdc2`. PEG parser interpreter, Coq, extracted to OCaml, proved terminating and sound/complete.
- **Lasser, Casinghino, Fisher & Roux, "A Verified LL(1) Parser Generator"**, ITP 2019, LIPIcs 141:24. **No arXiv ID** — search engines wrongly attach `1911.12737`, which is a different paper. <https://drops.dagstuhl.de/storage/00lipics/lipics-vol141-itp2019/LIPIcs.ITP.2019.24/LIPIcs.ITP.2019.24.pdf>
  **[local]** `lasser-casinghino-fisher-roux-2019-verified-ll1-parser-generator.pdf`, 523,685 bytes, sha256 `0e80eca0a7835ccbcc488ec0176be4b692f49d7398992ecda8012e0ffe7c4c58`. **~8,000 lines of Coq.** Remember that number.
- **Lasser et al., "CoStar: A Verified ALL(\*) Parser"**, PLDI 2021. No arXiv. <https://tyconmismatch.com/papers/pldi2021-costar.pdf>
- **Lasser et al., "Verified ALL(\*) Parsing with Semantic Actions and Dynamic Input Validation"**, NFM 2023. <https://tyconmismatch.com/papers/nfm2023_verified_allstar.pdf>
- **Blaudeau & Shankar, "A Verified Packrat Parser Interpreter for PEGs"**, CPP 2020. **arXiv:2001.04457**.
  **[local]** `blaudeau-shankar-2020-verified-packrat-peg-pvs.pdf`, 1,083,327 bytes, sha256 `31385a487274f0ed44fa4510df27fb0c48251e861893835bd3bdfb6718b239bc`. In PVS, and notable for using **ASTs as proof certificates** rather than inductive definitions.
- Lab index: <https://kathleenfisher.org/research/verified-parsing/>

#### Lineage C — Derivatives (regular languages, lexing, and LL(1))

Brzozowski derivatives turn "does this string match?" into repeated symbolic differentiation of the pattern. They are unusually proof-friendly, which is why almost all verified *lexers* use them.

- **Might, Darais & Spiewak, "Parsing with Derivatives: A Functional Pearl"**, ICFP 2011. <https://matt.might.net/papers/might2011derivatives.pdf>
- **Adams, Hollenbeck & Might, "On the Complexity and Performance of Parsing with Derivatives"**, PLDI 2016. **arXiv:1604.04695**.
  **[local]** `adams-2016-complexity-parsing-with-derivatives.pdf`, 748,881 bytes, sha256 `4917b8beac9764183b37dc21a9478e95f237d4a1cacdb5ea16a5ca2860203e5d`.
- **Edelmann, Hamza & Kunčak, "Zippy LL(1) Parsing with Derivatives"**, PLDI 2020. **arXiv:1911.12737**.
  **[local]** `edelmann-hamza-kuncak-2020-zippy-ll1-derivatives.pdf`, 692,087 bytes, sha256 `27be92402127cf350f45367b592e89390a0c36ea98083a55a6bde0549b93cb2e`. **Read this one.** Coq correctness proof, LL(1), *and* the same description yields enumeration and pretty-printing — the bidirectional idea from Lineage D, in an LL(1) setting.
- **Egolf, Lasser & Fisher, "Verbatim: A Verified Lexer Generator"**, LangSec/SPW 2021, and **"Verbatim++"**, CPP 2022 (<https://dl.acm.org/doi/pdf/10.1145/3497775.3503694>). Coq, derivative-based. The Lean package `veriflex` (§4.3) follows this line.
- **Ouedraogo, Scherer & Straßburger, "Coqlex: Generating Formally Verified Lexers"**, ‹Programming› 2024. **arXiv:2306.12411**.
  **[local]** `ouedraogo-2024-coqlex-verified-lexers.pdf`, 804,118 bytes, sha256 `7e2ef9c864cd66aa4b7e91e00deed7284786d6ec8a5f706c1e10a718596043df`. A verified `ocamllex` replacement designed to pair with Menhir `--coq` for an end-to-end verified front end.
- **In Lean 4**: **Zhuchko, Maarand, Veanes & Ebner, "Finiteness of Symbolic Derivatives in Lean"**, ITP 2025, LIPIcs 352:16.
  **[local]** `zhuchko-2025-finiteness-symbolic-derivatives-lean.pdf`, 945,921 bytes, sha256 `7b5194a6f30ae90ea849e099ff7744d6bc5e80457bba150967fdc0022bb52e06`. **The strongest genuinely-Lean-4 result in this space.** Not a parser — a constructive finiteness proof for symbolic derivatives, which is the foundation a verified Lean lexer would be built on.

#### Lineage D — Bidirectional: one description, parser *and* printer

**This is your lineage.** The idea: rather than writing a parser and a printer and proving they agree, write *one* description from which both are derived, so agreement is structural.

- **Rendel & Ostermann, "Invertible Syntax Descriptions: Unifying Parsing and Pretty Printing"**, Haskell Symposium 2010. <http://www.informatik.uni-marburg.de/~rendel/unparse/rendel10invertible.pdf> — the accessible entry point. Note honestly: the roundtrip is enforced by a *partial-isomorphism interface*, not machine-checked. That is a design pattern, not a proof.
- **Matsuda & Wang, "FliPpr: A Prettier Invertible Printing System"**, **ESOP 2013** (not APLAS), LNCS 7792:101–120; journal version *New Generation Computing* 36(3), 2018. You write only the pretty-printer; the parser is *derived* by inversion. If you want a single source of truth for your surface syntax, this is the idea to steal.
- **Danielsson, "Correct-by-Construction Pretty-Printing"**, DTP 2013, in Agda. <https://gup.ub.gu.se/file/126689> — the closest thing to a literal dependently-typed verified pretty-printer with a roundtrip guarantee.
- **van Geest & Swierstra, "Generic Packet Descriptions: Verified Parsing and Pretty Printing of Low-Level Data"**, TyDe 2017, Agda. <https://webspace.science.uu.nl/~swier004/publications/2017-tyde-a.pdf>
- **Delaware, Suriyakarn, Pit-Claudel, Ye & Chlipala, "Narcissus: Correct-by-Construction Derivation of Decoders and Encoders from Binary Formats"**, ICFP 2019. **arXiv:1803.04870**.
  **[local]** `delaware-2019-narcissus-decoders-encoders.pdf`, 840,852 bytes, sha256 `ec89ae3a9d32b69e0704beaae85b8abecd1cee5071445020e3361d03c51c1f44`.
- **Ramananandro et al., "EverParse: Verified Secure Zero-Copy Parsers for Authenticated Message Formats"**, USENIX Security 2019. <https://www.usenix.org/system/files/sec19-ramananandro_0.pdf> — **the roundtrip law is the headline theorem**: every parser built from their combinators is the inverse of the corresponding serializer, plus non-malleability (one binary representation per message). Shipped for TLS 1.0–1.3.
- **Tan & Morrisett, "Bidirectional Grammars for Machine-Code Decoding and Encoding"**, VSTTE 2016 / JAR 60(3), 2018 — a single Coq "bigrammar" yields decoder *and* encoder plus a machine-checked roundtrip proof, for ~300 x86 instructions. This is the verified-parsing core of **RockSalt** (Morrisett et al., PLDI 2012, <https://jtristan.github.io/papers/pldi12.pdf>).
- **Xie, Schrijvers & Hu, "Biparsers: Exact Printing for Data Synchronisation"**, POPL 2025, PACMPL 9. Handles the genuinely hard case — **exact printing when the parser is non-injective** (whitespace, layout, comments).
- **Chassot & Kunčak, "Formally Verified Linear-Time Invertible Lexing" (ZipLex)**, **arXiv:2510.18479**.
  **[local]** `chassot-kuncak-2025-verified-invertible-lexing-ziplex.pdf`, 1,078,729 bytes, sha256 `faa14717144aa512c2ccadcc257c75f9a4d0d0eba321d0d1ce9f9118f31b123e`. **The most recent direct hit on verified roundtripping** — longest-match semantics, lex/print invertibility, and linear time, all verified in Stainless/Scala. If you read one paper from this section, read this one and the Edelmann.

#### Lean 4, honestly

There is **no published, peer-reviewed verified parser or parser generator in Lean 4** comparable to TRX, CompCert-Menhir, or CoStar. What exists:

- Joe Hendrix's PEG formalization exercise (2022) — proved parsing deterministic. Repo: <https://github.com/joehendrix/parsing-verification>. Zulip thread: <https://leanprover-community.github.io/archive/stream/270676-lean4/topic/Parser.20Expression.20Grammars.20(PVS.20and.20Lean.20comparison).html>
- The ITP 2025 symbolic-derivatives result above — foundations, not a parser.
- **Dvořák, "Pursuit of Truth and Beauty in Lean 4: Formally Verified Theory of Grammars, Optimization, Matroids"**, PhD thesis (ISTA), **arXiv:2602.12891**.
  **[local]** `dvorak-2026-verified-grammars-lean4-thesis.pdf`, 1,774,745 bytes, sha256 `9f341d8d83214cb65ec6ef46cdbee15679e7e0736eeb8ebaf3e0ca623a12ff85`. Chomsky-hierarchy *theory* in Lean 4 — closure properties, not parsing algorithms.
- **Mishra & Jagannathan, "Morpheus: Automated Safety Verification of Data-Dependent Parser Combinator Programs"**, ECOOP 2023. **arXiv:2305.07901**.
  **[local]** `mishra-jagannathan-2023-morpheus-parser-combinators.pdf`, 1,014,946 bytes, sha256 `43b78dfb46ad3b152530ebba6da9f2f755220cde64a68c1e232ba830141f6c11`.

**So: if you want verified parsing in Lean 4, there is nothing to adopt wholesale.** The transferable assets are the Coq developments (as designs to port) and the ITP 2025 derivative foundations.

### 5.4 The cost, honestly

Here is the most useful number I found, and I found it by counting rather than by reading anyone's claims.

**Concrete — a Lean-hosted, explicitly verification-oriented language, whose README says its goal is "that you can see and trust exactly what code does" — has 372 theorems and lemmas in its repository. Zero of them are in its frontend.**

```
theorems/lemmas in Concrete/Frontend:            0
theorems/lemmas in whole repo (excluding .lake): 372
```

**VERIFIED** by counting `^\s*(theorem|lemma)\s` across all non-`.lake` Lean files. The `parse_*` theorems that turn up in a naive grep are about *user programs* that parse bytes — example code — not about the compiler's own parser.

That is not a criticism of Concrete. It is the correct engineering decision, and it tells you exactly where the industry line sits. A team that proves 372 things about its semantics, its type system, and its backend still does not prove anything about its parser, and instead guards the frontend with a grammar checker, fuzzing, and golden tests.

Now put a cost on each tier:

| Result | Effort | Evidence |
|---|---|---|
| **T0** totality | Hours (if up front) | `termination_by` on each recursive function. Free in Lean if you never write `partial def`. |
| **T1/T2** roundtrip, expression fragment | **Days to weeks** | Induction over a small AST, generalized over ambient precedence. Genuinely feasible for a small language. |
| **T1/T2** roundtrip, full language | Months | Every construct, every layout rule, every comment-attachment decision. |
| **T5** parser ⊨ grammar, LL(1) | **~8,000 lines of Coq** | Lasser et al. ITP 2019, for a *generator*, by four researchers, as a publication. |
| **T5** parser ⊨ grammar, ALL(\*) | A PhD | CoStar, PLDI 2021. |
| **T7** verified lexer with maximal munch | A paper each | Verbatim, Verbatim++, Coqlex, ZipLex — one publication per attempt. And Lean's `veriflex` still has this layer unfinished (§4.3). |

**Research-grade vs. engineering-feasible, stated plainly:**

- **Engineering-feasible for you now:** T0, T1, T2, T3, T4 on the expression fragment. Plus the LL(1) check, which is not a proof about your parser but is a machine-checked proof about your *grammar*, and is cheap.
- **Research-grade:** T5, T6 (in general), T7. These are publications, not sprints. If you find yourself starting one, you have made a scoping error.

**One more honest caveat about the middle tier.** T1/T2 being "days to weeks" assumes your parser is a *total function you can reason about*. If it is a `partial def`, or if it lives in `ExceptT ... (StateM ...)` with mutable position — as Concrete's does, and as most good hand-written parsers do — then the proof requires either restructuring the parser into a pure function or developing a specification logic for the monad stack. **That restructuring cost is usually larger than the proof itself**, and it is the single best argument for writing the expression parser as a pure `List Tok → Option (Exp × List Tok)` function from day one, as the §3.3 code does. You can keep the effectful, diagnostics-rich parser for everything else.

### 5.5 What engineering buys you instead of proof

Both reference clones show the same pattern: no proofs about the frontend, and a *stack* of cheap mechanical checks instead. This stack is what I would actually build.

**1. Grammar-class checking in CI.** Concrete's `check_ll1.py`, verified passing above (§2.9, exit 0, 60 rules). Buys unambiguity of the grammar. Cost: a few hundred lines, once. *Best value in this list.*

**2. Formatter idempotence.** From `scripts/tests/check_concrete_fmt.sh:57-61` — **VERIFIED by reading**:

```bash
echo "=== 4. --write is idempotent (second write changes nothing) ==="
cp "$SRC" "$TMP/after1.con"
"$C" fmt --write "$SRC" >/dev/null 2>&1
cmp -s "$SRC" "$TMP/after1.con" && ok "--write is idempotent" \
                                || no "--write is NOT idempotent (formatter not a fixpoint)"
```

That is theorem T-idempotent from §6, checked by execution on real inputs instead of proved. It catches the overwhelming majority of printer bugs, and it costs five lines of shell.

**3. Semantic fingerprint invariance across formatting.** The same script compares fingerprints of a program before and after formatting and requires them identical. That is a *direct* executable check that the printer preserves meaning — the engineering shadow of T1.

**4. Parser fuzzing.** `scripts/tests/test_parser_fuzz.sh`, 500 iterations by default, generating random bytes and random token soup from the lexical grammar:

> "Parser fuzzing: generate random/malformed .con inputs and verify the compiler never crashes (segfault, abort, hang). A clean failure (exit 1 with error message) is fine. A crash (signal-killed) or hang (timeout) is a bug."

That is T0 (totality) tested rather than proved — and in a language *with* a totality checker you get the proof for free, which is a nice illustration of what Lean is actually buying you.

**5. Differential implementations of the checker.** `check_ll1.py`, `check_ll1.c`, `check_ll1.rs` — three independent implementations of FIRST/FOLLOW analysis. If they disagree, one is wrong.

**6. Idempotent transcripts.** Unison's approach, and it is the most interesting one for a content-addressed system. `unison-src/transcripts/idempotent/` contains **339 files** (**VERIFIED** by counting), each a literate session whose *output must reproduce itself* when re-run. Since Unison's transcripts round-trip code through the hashed AST and back out through the pretty-printer, every one of those 339 files is an executable roundtrip test over real code. There is also a sibling `errors/` directory with 40 files pinning the *failure* messages.

**The pattern worth extracting:** each of these converts a theorem into a *check that runs on every commit*. None of them is a proof. All of them fail loudly the day the property breaks, which is most of what a proof would have done for you, at about 1% of the cost. Build this stack first. Then, if the roundtrip property turns out to be load-bearing for your content-addressed core — and I think it will be — prove T2 for the expression fragment on top of it.

### 5.6 The undecidability result, cited

§2.6 asserted that CFG ambiguity is undecidable. The classical sources, from 1962:

- **David G. Cantor, "On the Ambiguity Problem of Backus Systems"**, *JACM* 9(4):477–479, 1962. doi:[10.1145/321138.321145](https://doi.org/10.1145/321138.321145)
- **Robert W. Floyd, "On Ambiguity in Phrase Structure Languages"**, *CACM* 5(10):526–534, 1962. doi:[10.1145/368959.368993](https://doi.org/10.1145/368959.368993) — do not confuse this with Floyd's other 1962 CACM note on ALGOL 60.
- **Chomsky & Schützenberger, "The Algebraic Theory of Context-Free Languages"**, in *Computer Programming and Formal Systems*, North-Holland, 1963, pp. 118–161.
- Textbook: **Hopcroft & Ullman**, *Introduction to Automata Theory, Languages, and Computation*, 1979 — undecidability via reduction from the Post Correspondence Problem.

For a single modern citation that states the undecidability *and* develops the practical conservative approximations, use:

- **Brabrand, Giegerich & Møller, "Analyzing Ambiguity of Context-Free Grammars"**, CIAA 2007; journal version *Science of Computer Programming* 75(3):176–191, 2010. doi:[10.1016/j.scico.2009.11.002](https://doi.org/10.1016/j.scico.2009.11.002). PDF: <https://www.itu.dk/~brabrand/ambiguity-ciaa.pdf>

And if you ever do want to hunt ambiguity in a grammar that is *not* in a decidable class:

- **Schmitz, "Conservative Ambiguity Detection in Context-Free Grammars"**, ICALP 2007. <https://lsv.ens-paris-saclay.fr/~schmitz/pub/ambiguity.pdf>
- **Basten & Vinju**, the **AmbiDexter** line — "Faster Ambiguity Detection by Grammar Filtering" (LDTA 2010, <https://homepages.cwi.nl/~jurgenv/papers/LDTA-2010-2.pdf>) and "Parse Forest Diagnostics with Dr. Ambiguity" (SLE 2011, <https://homepages.cwi.nl/~jurgenv/papers/SLE2011-2.pdf>).

These are *conservative*: they report "no ambiguity found up to depth k," never "unambiguous." Which is exactly why staying inside LL(1) is the better move — you trade some syntactic freedom for a decidable question and a green check.

## 6. A worked micro-example, end to end

Everything above, applied to one tiny language, in the order you would actually do it.

### Step 1 — Write the programs you want to write

Before any grammar. Before any AST. Just the wish list:

```
1 + 2 * 3
(x + 1) * (y + 2)
price * qty + shipping
2 * 3 + 4 * 5
```

Four lines, and they have already decided three things:

- I want infix `+` and `*` — not `(+ 1 2)`, not `1.add(2)`.
- I want `*` to bind tighter than `+`, because line 1 must be `7` and line 4 must be `26`. Every reader expects this and I will not fight it.
- I want parentheses, because line 2 needs to override the default.

**This is the step people skip, and it is the most valuable one.** Notice that I derived a precedence requirement from a program I wanted to write, rather than from a table I copied. When you get to the scripting surface, write twenty programs you wish you could write — real ones, with the awkward cases — before you write a single production.

### Step 2 — Design the AST

The wish list mentions numbers, names, addition, multiplication. Parentheses appear in the *text* but they are not a *thing that happens*; they are grouping. So they do not get a constructor — see the §4.4 discussion, and note this is the content-addressed choice.

```lean
inductive Exp where
  | lit : Int → Exp
  | var : String → Exp
  | add : Exp → Exp → Exp
  | mul : Exp → Exp → Exp
  deriving Repr, DecidableEq
```

Four constructors. `DecidableEq` is not decoration — it is what lets the roundtrip theorem in step 6 be stated as an equation, and what lets `#guard` check it by computation.

**Why the AST comes first.** It is the thing every later phase consumes — the evaluator, the type checker, the hasher, the printer. The grammar is one particular textual encoding of it, and you may end up with several (a script surface, a JSON surface, an editor's structural view). Design the durable thing first and the encodings against it. Concrete's frontend has one AST and both a parser and a formatter pointed at it; that is the shape to copy.

### Step 3 — Write the grammar, with precedence

```ebnf
exp    = term { "+" term } ;
term   = factor { "*" factor } ;
factor = NUM
       | IDENT
       | "(" exp ")" ;
```

Three rules. Stratified by precedence (§2.7), with `{ }` repetition instead of left recursion (§3.2) so it is LL(1)-compatible.

Check it against §2.9 by hand:

- `FIRST(exp) = FIRST(term) = FIRST(factor) = { NUM, IDENT, "(" }`
- `factor`'s three alternatives have FIRST sets `{NUM}`, `{IDENT}`, `{"("}` — **pairwise disjoint**. ✓
- The `{ "+" term }` loop continues on `"+"` and stops otherwise; `"+" ∉ FIRST(term)`, so there is no conflict between continuing and stopping. ✓

LL(1). One token of lookahead decides everything.

### Step 4 — Where ambiguity threatened

Three places, all real:

**(a) Precedence — the one that actually bit.** My first instinct was the compact grammar:

```ebnf
exp = exp "+" exp | exp "*" exp | NUM | IDENT | "(" exp ")" ;
```

Shorter and more symmetric. Also ambiguous: `1 + 2 * 3` has two parse trees (§2.5) meaning `7` and `9`. Stratifying into `exp`/`term`/`factor` killed it. **Detected by**: writing down both trees for a wish-list program and noticing they gave different numbers.

**(b) Associativity — the one that hides.** `{ "+" term }` says *what* repeats but not how it groups. `1 + 2 + 3` could fold left or right. For `+` and `*` it does not matter numerically, so it is tempting to ignore — but the moment you add `-`, `8 - 3 - 2` is `3` under left-fold and `7` under right-fold. **Decision: fold left**, which is both the arithmetic convention and what the accumulator loop in §3.2 does naturally. Recorded now, while the language is four constructors, rather than discovered later as a bug report.

**(c) Unary minus — deferred, and here is the warning.** I left `-` out entirely. Had I added it, `-x * y` is ambiguous between `(-x) * y` and `-(x * y)`, and `a - -b` requires the lexer not to munch `--` into one token (§2.2). Prefix and infix operators sharing a spelling is the single most common source of expression-grammar ambiguity, and the standard fix is to give unary minus its own precedence level above all binary operators. **Noted as a known cost before adding it**, which is the whole point of doing this on paper.

### Step 5 — Implement, and check the examples

The Pratt parser from §3.3, plus a precedence-aware printer. The printer is the interesting half:

```lean
def printAt : Exp → Nat → List Tok
  | .lit n, _ => [.int n]
  | .var s, _ => [.ident s]
  | .add a b, p =>
      let body := printAt a 65 ++ [.plus] ++ printAt b 66
      if p > 65 then .lparen :: body ++ [.rparen] else body
  | .mul a b, p =>
      let body := printAt a 70 ++ [.star] ++ printAt b 71
      if p > 70 then .lparen :: body ++ [.rparen] else body

def print (e : Exp) : List Tok := printAt e 0
```

**Look at how the printer mirrors the parser.** The parser recursed at `p + 1` on the right; the printer prints the right child at `p + 1`. The parser stopped when `p < minPrec`; the printer parenthesizes when `p > 65`. The same table, read in the opposite direction. **That correspondence is not a coincidence — it is what makes the roundtrip theorem true, and if you ever change one table you must change the other.** Keeping precedence in *one* shared table that both consult is the way to avoid that bug class entirely.

The checks — all in the compiled file, all passing, **VERIFIED** exit code 0:

```lean
-- Roundtrip, checked on concrete inputs
#guard parse (print (.add (.lit 1) (.mul (.lit 2) (.lit 3))))
       == some (.add (.lit 1) (.mul (.lit 2) (.lit 3)))

#guard parse (print (.mul (.add (.lit 1) (.lit 2)) (.lit 3)))
       == some (.mul (.add (.lit 1) (.lit 2)) (.lit 3))

-- The case that needs the printer to insert parens: right-nested +
#guard print (.add (.lit 1) (.add (.lit 2) (.lit 3)))
       == [.int 1, .plus, .lparen, .int 2, .plus, .int 3, .rparen]

#guard parse (print (.add (.lit 1) (.add (.lit 2) (.lit 3))))
       == some (.add (.lit 1) (.add (.lit 2) (.lit 3)))
```

The third one is the load-bearing case. `add (lit 1) (add (lit 2) (lit 3))` is right-nested, but `+` is left-associative, so printing it as `1 + 2 + 3` would reparse as `add (add 1 2) 3` — **wrong tree**. The printer must emit `1 + (2 + 3)`, and the `#guard` pins exactly that. This is the smallest example of why a printer cannot just concatenate operands, and it is the case that a hand-built AST hits and a parser-built AST never does.

### Step 6 — State the theorem

The `#guard`s check four inputs. The theorem quantifies over all of them.

```lean
/-- **Print-parse identity.** Printing any AST and reparsing recovers it exactly.
    This is the strong direction and the one worth having. -/
theorem parse_print (e : Exp) : parse (print e) = some e := by
  sorry

/-- **Parse-print stability on the parser's image.** Anything the parser accepts
    reprints to something that parses back to the same tree. Weaker, but it is
    exactly what a formatter needs. -/
theorem print_parse_stable (ts : List Tok) (e : Exp) (h : parse ts = some e) :
    parse (print e) = some e := by
  sorry

/-- **Formatter idempotence**, a corollary shape: printing is a fixpoint after
    one pass. -/
theorem print_idempotent (ts : List Tok) (e : Exp) (h : parse ts = some e) :
    (parse (print e)).map print = some (print e) := by
  sorry
```

**`[compiles]` — VERIFIED**, `lean Pratt.lean`, exit code 0, with exactly three warnings:

```
Pratt.lean:116:8: warning: declaration uses `sorry`
Pratt.lean:122:8: warning: declaration uses `sorry`
Pratt.lean:128:8: warning: declaration uses `sorry`
EXIT=0
```

**These are statements, not proofs.** The `sorry` is deliberate and the warnings are the honest signal — Lean is telling you, and will keep telling you in CI, that these are unproved. That is the correct state for them to be in right now, and it is much better than not writing them down: a stated theorem is a specification you can hand to a prover later, and a target that the `#guard`s are sampling.

Note the shape difference between the three, because it is the whole economics of §5:

- `parse_print` quantifies over **all** `e : Exp`. Strongest. Requires reasoning about the printer's parenthesization being *exactly* sufficient at every precedence level — an induction with a generalized statement about ambient precedence.
- `print_parse_stable` is restricted to `e` in the **image of the parser**. Weaker, cheaper, and it is what a formatter actually needs. For Concrete's `paren`-preserving design (§4.4), this one holds while `parse_print` does not.
- `print_idempotent` is the property a `--check` mode in CI is really asserting, and it follows from either of the above.

**Which one do you want?** If your core is content-addressed and terms get constructed programmatically — by macros, by agents, by refactoring tools — then trees will exist that no parser produced, and you want `parse_print`. If the only trees that exist came from parsing text, `print_parse_stable` suffices.

---

## 7. The checklist

The process I would follow for the scripting surface, in order, each step annotated with what — if anything — guards it.

Guard levels, used in the table:

- **[none]** — judgement. No mechanism will save you; think harder and get feedback.
- **[artifact]** — produces a durable, diffable, reviewable thing. Not a theorem, but it makes drift visible.
- **[checked]** — mechanically enforced today, cheaply, in CI.
- **[provable]** — a real theorem you could state and prove with effort measured in days-to-weeks.
- **[research]** — a theorem the literature can state but which is not engineering-feasible for a small language right now.

| # | Step | Guard | What guards it |
|---|---|---|---|
| 1 | Write 20 programs you wish you could write | **[none]** | Taste, and showing them to other people. Skipping this is the most common failure. |
| 2 | Extract the AST from those programs | **[none]** | But `deriving DecidableEq, Repr` immediately, so later steps can be stated as equations. |
| 3 | Decide whether the AST is *canonical* | **[artifact]** | Write the decision down. Content-addressed core ⇒ no `paren` node, no redundant encodings (§4.4). |
| 4 | Write the reference grammar in EBNF | **[artifact]** | One file, versioned, the spec. Concrete's is 60 rules / 16 KB. |
| 5 | Build one precedence + associativity table | **[artifact]** | *One* table, consulted by both parser and printer. Prefer a named ordered type over bare `Nat` (Unison's `Precedence`, §2.8). |
| 6 | **Check the grammar is LL(1)** | **[checked]** | FIRST/FOLLOW conflict detection in CI. **Implies unambiguity** — buys you the thing §2.6 says is undecidable in general. Highest value-per-hour in this list. |
| 7 | Implement the lexer, hand-written, with spans on every token | **[artifact]** | Spans cannot be retrofitted cheaply. Do it on day one. |
| 8 | Implement the parser: recursive descent + Pratt for expressions | **[checked]** | `example ... := rfl` per precedence/associativity claim (§4.1). One line each, catches every table regression. |
| 9 | Implement the printer from the *same* precedence table | **[checked]** | `#guard` roundtrips, including the right-nested-operator case that forces parens (§6 step 5). |
| 10 | Property-test the roundtrip on generated ASTs | **[checked]** | `parse ∘ print = some` over random trees. This is `parse_print` sampled — cheap, and it finds real bugs. |
| 11 | **State** the roundtrip theorems, with `sorry` | **[artifact]** | The `sorry` warnings are an honest standing signal in CI. A stated theorem is a spec. |
| 12 | Prove `parse_print` for the expression fragment | **[provable]** | Induction on `Exp`, generalized over ambient precedence. Days, not months, for a small language. See §5. |
| 13 | Formatter idempotence in CI (`fmt --check`) | **[checked]** | Concrete does exactly this; §5 quotes their check. Catches printer bugs without a proof. |
| 14 | Error recovery + structured diagnostics with codes | **[artifact]** | Errors as records, not strings (§3.6). The agent-facing interface. |
| 15 | Prove the hand-written parser matches the reference grammar | **[research]** | The gap Concrete names explicitly and does not close (§3.5). Nobody small closes this. |
| 16 | Prove full grammar unambiguity directly | **[research]** | Undecidable in general (§2.6). Do step 6 instead — it gets you the consequence you wanted. |
| 17 | Verified lexer (maximal munch proved correct) | **[research]** | Even `veriflex`, which set out to do this in Lean, has it unfinished (§4.3). |

### The shape of the advice

Steps 1–11 are all achievable with ordinary engineering, and together they are most of the value. Step 6 in particular is the bargain of the whole document: a few hundred lines of FIRST/FOLLOW analysis, run in CI, converts "is my grammar ambiguous?" from an undecidable question into a green check.

Step 12 is the one real proof I would encourage you to attempt, and only for the expression fragment. It is small, self-contained, and it is the property that a content-addressed core genuinely needs.

Steps 15–17 are where you should *stop*, and say so in writing. Naming what you did not prove is what makes the things you did prove believable — which is precisely why Concrete's `external-ll1-checker.md` ends with an explicit "this does not prove" list, and why `veriflex`'s README says the maximal-munch layer is unverified. Copy that habit before you copy anything else in this document.

### Three decisions to make early, because they are expensive later

1. **Canonical AST or source-faithful AST?** A `paren` node makes formatting easy and hashing wrong. Pick deliberately (§4.4). For a content-addressed spine, canonical.
2. **Syntactic disambiguation or semantic disambiguation?** Concrete decides everything at parse time with one token; Lean defers to the elaborator and resolves by type (§4.2). Predictability for agents argues strongly for the former.
3. **Which delimiters?** `<` `>` for type arguments costs you the `>>` split forever (§2.2). `[` `]` costs you a collision with indexing. There is no free choice — but there is an *informed* one.

---

## Appendix A — Verification ledger

Everything this document claims first-hand, and how it was established. Anything not listed here is cited to a URL and was not independently confirmed.

**Toolchain.** `lean` v4.33.1, `x86_64-w64-windows-gnu`, commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`, Release. Invoked as bare `lean <file>` with a `lean-toolchain` file pinning `leanprover/lean4:v4.33.1`.

### Lean code compiled

| Claim | Method | Result |
|---|---|---|
| `syntax`/`macro_rules` DSL with precedence and associativity (§4.1) | `lean Dsl.lean` | **exit 0**; four `example ... := rfl` and four `#guard` all discharge |
| Pratt parser + precedence-aware printer (§3.3, §6) | `lean Pratt.lean` | **exit 0**; seven `#guard` pass; three `sorry` warnings on the deliberately-stated theorems |
| Deliberately ambiguous `notation` (§4.2) | `lean Amb.lean` | **exit 1**, `error: Ambiguous term` with both interpretations printed |
| `Std.Internal.Parsec` is the current parsec path (§4.3) | `lean ParsecProbe.lean` | **exit 0**; `Except.ok "123"` / `Except.error "offset 0: digit expected"` |
| `Lean.Parsec` no longer exists on v4.33.1 (§4.3) | same probe | `error(lean.unknownIdentifier): Unknown identifier 'Lean.Parsec'` |
| `termination_by` after `end` in a `mutual` block is a syntax error (§3.3) | observed while writing `Pratt.lean` | `unexpected token 'termination_by'; expected command` |

The full source of both Lean files is reproduced inline in §3.3, §4.1, and §6 — the document is self-contained, so you can recreate and re-run them without the scratch directory.

### Reference clones read

Clone root `C:\Users\kokok\Dev\foldlab\.reference\clones\`.

| Claim | Source | Method |
|---|---|---|
| Concrete's grammar is LL(1) and machine-checked (§2.9) | `concrete/scripts/check_ll1.py`, `concrete/grammar/concrete.ebnf` | **Executed**: "Parsed 60 grammar rules… LL(1) check passed: no FIRST/FIRST conflicts found." exit 0 |
| Precedence table (§2.8) | `concrete/Concrete/Frontend/Parser.lean:810-830` | Read |
| Precedence climbing in production (§3.3) | `concrete/Concrete/Frontend/Parser.lean:832-847` | Read |
| `pendingGt` / the `>>` split (§2.2) | `concrete/Concrete/Frontend/Parser.lean:31, 82-89` | Read |
| Context-sensitive keywords (§2.2) | `concrete/Concrete/Frontend/Parser.lean:91-100` | Read |
| Parser monad stack (§3.1) | `concrete/Concrete/Frontend/Parser.lean:28-40` | Read |
| Printer has no precedence logic; AST has a `paren` node (§4.4) | `concrete/Concrete/Frontend/Format.lean:139`, `AST.lean:163`, `Parser.lean:573-576` | Read |
| LL(1) as a language-design constraint; the five resolved sites (§2.9, §4.4) | `concrete/research/compiler/ll1-grammar.md` | Read |
| Scope limits of the checker (§2.9, §3.5) | `concrete/research/compiler/external-ll1-checker.md` | Read |
| Syntax review process, non-goals, timing (§1.6) | `concrete/research/language/ll1-syntax-review.md` | Read |
| Formatter idempotence check (§5.5) | `concrete/scripts/tests/check_concrete_fmt.sh:57-61` | Read |
| Parser fuzzing, 500 iterations (§5.5) | `concrete/scripts/tests/test_parser_fuzz.sh` | Read |
| **372 theorems in repo, 0 in frontend** (§5.4) | all non-`.lake` `.lean` files | **Counted** via regex `^\s*(theorem\|lemma)\s` |
| Unison precedence as an ordered type (§2.8) | `unison/parser-typechecker/src/Unison/Syntax/Precedence.hs:34-67` | Read |
| Ambient-precedence printer (§4.4) | `unison/parser-typechecker/src/Unison/Syntax/TermPrinter.hs:100-104` | Read |
| Names live outside the term (§1.7) | `unison/parser-typechecker/src/Unison/PrettyPrintEnv.hs:43-48` | Read |
| **339 idempotent transcripts, 40 error transcripts** (§1.7, §5.5) | `unison/unison-src/transcripts/` | **Counted** |

### Web sources fetched personally

- Rust RFC template section headings (§1.4) — <https://github.com/rust-lang/rfcs/blob/master/0000-template.md>
- Go type-parameters proposal, square-bracket rationale (§1.5) — <https://go.googlesource.com/proposal/+/refs/heads/master/design/43651-type-parameters.md>
- Go generics introduction (§1.5) — <https://go.dev/blog/intro-generics>

**Explicitly not verified**, and flagged as such in the text: the parsing-ambiguity discussion in Go's issue tracker (§1.5); the `sorry`/`axiom` counts in `nasa-jpl/L4YAML`, which come from code search and would need a local build to confirm (§4.3); PDF URLs in §5.3 not marked `[local]`.

### PDFs added to `.reference/papers/`

Ten open-access PDFs were downloaded from arXiv and Dagstuhl (canonical publisher hosts), each confirmed to have a `%PDF` header:

| File | Bytes | SHA-256 |
|---|---|---|
| `koprowski-binsztok-2011-trx-verified-parser-interpreter.pdf` | 311,596 | `2c1207556ef8fdece9863229073735fff84aae15b72b84ec504f79d2f0e0fdc2` |
| `chassot-kuncak-2025-verified-invertible-lexing-ziplex.pdf` | 1,078,729 | `faa14717144aa512c2ccadcc257c75f9a4d0d0eba321d0d1ce9f9118f31b123e` |
| `delaware-2019-narcissus-decoders-encoders.pdf` | 840,852 | `ec89ae3a9d32b69e0704beaae85b8abecd1cee5071445020e3361d03c51c1f44` |
| `edelmann-hamza-kuncak-2020-zippy-ll1-derivatives.pdf` | 692,087 | `27be92402127cf350f45367b592e89390a0c36ea98083a55a6bde0549b93cb2e` |
| `blaudeau-shankar-2020-verified-packrat-peg-pvs.pdf` | 1,083,327 | `31385a487274f0ed44fa4510df27fb0c48251e861893835bd3bdfb6718b239bc` |
| `ouedraogo-2024-coqlex-verified-lexers.pdf` | 804,118 | `7e2ef9c864cd66aa4b7e91e00deed7284786d6ec8a5f706c1e10a718596043df` |
| `adams-2016-complexity-parsing-with-derivatives.pdf` | 748,881 | `4917b8beac9764183b37dc21a9478e95f237d4a1cacdb5ea16a5ca2860203e5d` |
| `mishra-jagannathan-2023-morpheus-parser-combinators.pdf` | 1,014,946 | `43b78dfb46ad3b152530ebba6da9f2f755220cde64a68c1e232ba830141f6c11` |
| `dvorak-2026-verified-grammars-lean4-thesis.pdf` | 1,774,745 | `9f341d8d83214cb65ec6ef46cdbee15679e7e0736eeb8ebaf3e0ca623a12ff85` |
| `zhuchko-2025-finiteness-symbolic-derivatives-lean.pdf` | 945,921 | `7b5194a6f30ae90ea849e099ff7744d6bc5e80457bba150967fdc0022bb52e06` |

Two relevant PDFs were **already present** in that directory and were hashed rather than re-downloaded:

| File | Bytes | SHA-256 |
|---|---|---|
| `jourdan-pottier-leroy-2012-validating-lr1-parsers.pdf` | 525,789 | `12c960e08f7b52357ec2cbf107dba5357e3bf192a165ec20492a9eb7eeda2b11` |
| `lasser-casinghino-fisher-roux-2019-verified-ll1-parser-generator.pdf` | 523,685 | `0e80eca0a7835ccbcc488ec0176be4b692f49d7398992ecda8012e0ffe7c4c58` |

### Two citation corrections worth recording

1. **The ITP 2019 "A Verified LL(1) Parser Generator" has no arXiv ID.** Search engines commonly attach `arXiv:1911.12737` to it; that ID belongs to Edelmann, Hamza & Kunčak's "LL(1) Parsing with Derivatives and Zippers" (PLDI 2020). Do not propagate the mix-up.
2. **FliPpr's original venue is ESOP 2013**, not APLAS.

---


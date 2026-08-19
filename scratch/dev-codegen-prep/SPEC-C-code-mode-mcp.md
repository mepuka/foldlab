# Spec C — the code-mode MCP view

Prep only. No server code, no tool schema, no runtime. This states the pattern,
the artifacts it depends on, and the questions that need ruling before anyone
builds it.

## The charge

The language must be explainable. A plain-TypeScript representation — things as
functions and arguments — because TypeScript is the language models generate
best. That representation becomes an MCP view: the code-mode pattern for this
language.

## The pattern

Today's wire projection is eight flat tools, one per generator, each with a flat
argument list. A model calls one tool per sentence.

Code mode inverts that. One tool surface — write code — where the model authors
plain TypeScript against a generated SDK whose vocabulary *is* the language.
Composition happens in the code, not in a sequence of tool calls. Eight sentences
that would be eight round trips become one program.

What makes it lawful rather than an escape hatch is the routing: nothing the
code can do reaches an effect except by presenting a candidate to the one
admission function. The SDK is not a client of the runtime; it is a way of
spelling candidates. Judgment stays where it is.

Three properties the pattern must hold, in order of how easily each is lost:

1. **Judgment is never bypassed.** Every effect is a candidate through the door.
   The door already refuses in the value channel and mints every refusal from
   the generated table, so a code-mode result carries the same reason, law, and
   repair as any other seam.
2. **The vocabulary is the projection.** The SDK the model writes against is
   emitted from the grammar, not hand-maintained. Otherwise code mode becomes
   the second assembler the estate refuses everywhere else.
3. **Refusals teach in the code.** A refused candidate returns its taught row to
   the model, in the same rendering every other surface uses, so the model can
   repair and retry inside the same program.

## The precedent that already exists

A running MCP server in the prototype tree derives its tools from the daemon's
own self-description rather than a hand-written list. Its header states the
property this view inherits:

> tools are DERIVED from contract.describe at startup — the daemon's own
> description, through the json-schema codegen target, becomes each tool's input
> schema. There is no hand-written tool list to drift (drift is structurally
> impossible; a daemon that grows a request kind grows a tool).

and, on results:

> Tool results carry facts and refusals as DATA, never MCP protocol errors

Both are exactly the code-mode posture. The second one matters more than it
looks: a refusal delivered as a protocol error is a refusal the model cannot
read, repair, and retry.

The rendering precedent is the CLI's: encode the refusal through its own schema,
canonicalize, emit — a function that names none of the taught fields, and is
total over the sum because the schema is. Its negative control asserts that
library-level usage errors are rendered by the library and carry no estate
vocabulary. Code mode needs the same split: a TypeScript syntax error is not a
refusal, and dressing it as one would put a second vocabulary on the seam.

## The blocking dependency, stated plainly

**The adopted SDK sketch cannot reach the door.**

It projects only lawful acts, on a stated principle — an SDK that cannot spell
the crime is the point. The consequence, measured in Census A: the sketch
declares an admitted-or-refused result type and contains nothing that can
produce one. There is no way to spell a candidate, and the door's one judgment
function takes a candidate.

The candidate grammar is generated and shipped: eleven candidate-act arms (the
eight generators, four widened with a slot that makes the crime spellable, plus
three pure crimes), nine candidate-predicate arms, and eight raw-argument atoms
of which five are unlawful. That grammar is precisely what a model needs in
order to be *refused and taught* rather than prevented.

So the two surfaces want opposite things:

| | authoring SDK | code-mode SDK |
| --- | --- | --- |
| goal | the crime has no spelling | the crime is spellable and taught |
| ties | dependent, at the constructor | the door's, at admission |
| result | a well-typed act | a verdict |

This is the central design row. Three ways to resolve it, unpriced here on
purpose — it wants a grill, not a preference:

- **one SDK, two halves** — the lawful constructors plus a candidate half, with
  the door between them;
- **two emitted SDKs** from one grammar, differing in which arms they carry;
- **code mode takes the candidate grammar only**, and the dependent-tie
  constructors stay an authoring convenience outside the view.

Whichever wins, the artifact code mode needs is *emitted*, which is why this
view is blocked on the SDK becoming generated rather than on any MCP work.

## Artifacts required

| artifact | state | note |
| --- | --- | --- |
| the emitted SDK | owed | the blocking dependency above |
| a sandbox posture | undecided | see grill rows |
| refusal rendering | exists as precedent | reproduce the CLI's, do not re-invent |
| the door | exists | pure, value-channel, no Effect |
| writ-projected capability list | owed | the tool list a caller sees is projected through its writ, and that projection carries an unpaid soundness obligation |
| SDK versioning | undecided | see grill rows |

## The algebra already names this

Code execution is not a new construct. The harness mapping names it: an action
at the boundary — declaration, then fenced outcome, then attested evidence —
composed from `declare`, `decide`, and `emit`. The storage note's row adds the
carriage: `spawn` under a writ, with a sandbox specified as a root directory and
a token, outcomes journalled back.

That gives code mode its denotation, which is what the admission test asks for
first. It also says something useful about scope: the sandbox is not ambient
configuration, it is a declared thing under a writ, and the referent rules
already have a refusal for reaching outside it.

## Grill rows

Open, with what makes each hard. No recommendations — these need the operator.

**1. The sandbox boundary.** The algebra says a sandbox is a root directory and
a token under a writ. What is the code's actual execution boundary — a process,
a worker, an interpreter over a restricted vocabulary? The strongest form is
that the code cannot perform *any* effect except by returning candidates, in
which case the sandbox question mostly dissolves and the interesting question
becomes whether the code may loop on verdicts (it must, to repair) and what
bounds that loop. The weakest form is a real process with a root directory,
which reintroduces every ambient-reference problem the algebra refuses.

**2. Which capabilities the view exposes.** The tool list a caller sees is
projected through its writ, and that projection's soundness is owed. Code mode
sharpens the question: a tool list is enumerable and checkable, an SDK surface
is a module the code imports. If the writ narrows the vocabulary, the SDK the
model sees must narrow with it — which makes the SDK a *per-writ projection*,
not one artifact. If it does not narrow, the door refuses off-writ referents at
admission and the SDK is one artifact that can spell more than a given caller
may land. These are different systems.

**3. Versioning of the SDK the model sees.** Every rendered surface now carries
its provenance as a digest of the corpus it derives from. Code mode makes that
load-bearing rather than informational: the model writes against a vocabulary,
and a verdict is only meaningful relative to the vocabulary that produced the
candidate. Does the code declare the SDK digest it was written against? Does the
view refuse a program written against a stale one, or admit and let the door's
own refusals catch the divergence? The second is cheaper and lets old programs
keep working; the first is the only one that makes "this program is lawful" a
statement with a fixed meaning.

**4. What a verdict loop looks like.** Not in the original brief, but it falls
out of the first row. If refusals teach, the model repairs and retries — inside
one program, or by returning and being called again? The first makes the tool
stateful for the duration; the second makes each call a fresh program and puts
the repair loop in the model's context. The taught rows carry an applicability
marking — four of sixteen are machine-applicable, meaning the lawful rewrite is
a function of the refused candidate alone — which suggests some repairs could be
applied without the model at all. That is a real affordance and it needs ruling
before it is built by accident.

## What this spec deliberately does not do

No tool schema. No server. No sandbox implementation. No decision on any of the
four rows above. The view is blocked on an emitted SDK, and specifying its wire
shape before the vocabulary is generated would produce exactly the
hand-authored twin the pipeline exists to prevent.

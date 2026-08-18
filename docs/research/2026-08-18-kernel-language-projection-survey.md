# Kernel-language projection survey — external evidence for the KM grill

Status: **SURVEY, informational only.** Commissioned 2026-08-18 by the
operator through the coordinator; written by a Fable research seat.
This memo gathers evidence and prior art from OUTSIDE the estate that
bears on the KM grill sheet
(`docs/research/2026-08-18-kernel-model-notes.md` §11) and the ratified
kernel-algebra record
(`docs/design/2026-08-18-plait-kernel-algebra.md`). It decides nothing,
recommends options only where external evidence leans, and marks every
claim with its tier. It changes no code and no design status.

For an outsider, the context in one paragraph. The estate is designing
a small algebraic language as its agent-facing API: eight primitive
acts (`declare`, `resolve`, `emit`, `join`, `fold`, `decide`,
`trigger`, `spawn`) over content-addressed state, where every
identifier is a cryptographic digest branded by declaration kind
(schema, program, policy, and nine more), and every unlawful act either
cannot be written down at all or is refused at one admission door with
a taught refusal (the reason, the law it defends, and the legal next
move). The design mandates one grammar stated as data and projected
three ways: MCP tools (the JSON-schema wire that LLM agents call),
TypeScript (the authoring SDK), and prose (docs and teaching frames).
LLM agents are the only first-class users. The operator asked: what
does the outside world know about (1) projecting such a language into
prose and TypeScript, (2) making LLMs populate the wire reliably,
(3) encoding branded references and canonical values in JSON Schema,
and (4) language/DSL design generally — including an eventual
DAG-shaped visual surface.

Evidence tiers, used on every load-bearing claim:

- **MEASURED** — a study's own numbers, read against the primary
  source this session; "(abstract tier)" marks claims verified only
  against the paper's abstract or a secondary summary of it.
- **PRACTICE** — vendor documentation, specification text, or
  community convention: what practitioners do, not what experiments
  prove.
- **SYNTHESIS** — this memo's own inference across sources, always
  labeled.
- **LEAD** — a claim found but not verified against a primary source
  this session; treat as a pointer, not evidence.

---

## 1. Result first — the strongest findings on one screen

1. **The operator's specific worry — a field named `schema` whose
   value is a digest naming a schema — has, as far as this survey
   found, no direct published study.** That absence is a finding. The
   nearest-neighbor evidence all leans the same way, though: (a) the
   text-to-SQL literature documents *schema linking* — binding a name
   in the request to the right schema element rather than a value —
   as a top, sometimes catastrophic, LLM failure class, with lexical
   ambiguity between similarly-named items called out as the main
   driver (MEASURED, abstract tier, §3.4); (b) tool-calling failure
   taxonomies put "incorrect argument names" and "incorrect argument
   values" among the recurring error types (MEASURED, abstract tier,
   §3.3); (c) `schema` as a field name has a concrete engineering
   history of colliding with metaprogramming machinery — pydantic
   refuses a field named `schema` outright because it shadows the
   framework's own `schema` attribute (PRACTICE, §4.2). Vendor
   guidance (Anthropic: rename `user` to `user_id`) directly supports
   the repair: name the field for the value it carries
   (`schema_digest`), not for the kind it references (SYNTHESIS on
   PRACTICE, §3.2, §4.2).
2. **Schema complexity is the decisive reliability variable for
   structured output.** JSONSchemaBench (~10k real-world schemas)
   finds both constrained-decoding engines and the models themselves
   degrade sharply as schemas grow nested, pattern-constrained, and
   union-heavy; flat, shallow, enum-light object schemas are the
   reliable regime (MEASURED, abstract tier + secondary numbers,
   §3.5). Format restriction itself costs reasoning ("Let Me Speak
   Freely": stricter format constraints degrade reasoning-task
   performance; MEASURED, abstract tier, §3.5). The eight-generator
   wire is naturally in the reliable regime — eight small flat tools —
   and the survey found nothing pushing the other way.
3. **Tool names and descriptions measurably matter, but the
   published evidence is mostly indirect.** Anthropic's own
   agent-tool engineering guidance reports that "small refinements to
   tool descriptions can yield dramatic improvements" and gives
   concrete rules (unambiguous parameter names, prefix namespacing,
   examples in descriptions, actionable errors) — PRACTICE with
   internal evals behind it, not public ablations (§3.2). EASYTOOL
   shows rewriting long, redundant tool documentation into concise
   standardized instructions improves tool-use performance and cuts
   tokens (MEASURED, abstract tier, §3.2). A clean public ablation
   isolating *name quality alone* was not found (§3.1).
4. **One grammar, many projections has strong prior art and it
   works.** The Grammatical Framework (GF) is thirty years of exactly
   this shape — one abstract syntax, any number of concrete syntaxes
   (formal and natural-language), bidirectional — at production scale
   (PRACTICE + literature, §2.3). Controlled natural languages have
   measured comprehension wins: in Kuhn's ontograph experiments,
   Attempto Controlled English was more understandable, faster to
   learn, and better accepted than a comparable formal notation
   (MEASURED, abstract tier, §2.2). The prose projection is not
   speculative; it is the best-evidenced of the three.
5. **The taught-refusal shape (reason + law + repair) matches fifty
   years of error-message research and the best industrial
   practice.** The Becker et al. ITiCSE working-group report distills
   the field's guidelines — messages should locate, explain, and
   propose the fix; Elm and Rust are the acknowledged industrial
   leaders on exactly that shape, and a Rust study measured improved
   debugging performance from enhanced messages (MEASURED/PRACTICE,
   §5.1). Anthropic's agent guidance independently converges:
   actionable error messages steer agents to correct usage
   (PRACTICE, §3.2). Nothing found argues against the refusal design;
   several sources argue for making the repair the message's center.
6. **For the DAG lane: graphs are good to read, bad to emit.** The
   visual-languages literature names the scaling-up problem
   (Burnett): node surfaces excel at small programs and degrade into
   spaghetti at scale (MEASURED/literature, §6.1). On the LLM side,
   graph encoding choice swings accuracy by 4.8–61.8% ("Talk like a
   Graph"; MEASURED, abstract tier), the best ComfyUI workflow agents
   solve only ~32.5% of tasks, and the same benchmark finds *code*
   beats JSON/graph formats as the representation LLMs generate
   (MEASURED, §6.2). The "Bitter Lesson of Tool Calling" paper finds
   programmatic (code) tool calling beats JSON tool calling
   increasingly with chain depth, +18.8% absolute at chains of 12+
   (MEASURED, §3.1). Convergent lean: the DAG is a *projection for
   reading and auditing*; authoring by agents should stay on the
   linear grammar (SYNTHESIS, §6.3).

---

## 2. Area 1 — projection legibility: prose and TypeScript renderings

### 2.1 What the question is

The kernel grammar will be stated once as data and projected to (a)
prose an agent or human reads, and (b) a TypeScript authoring surface.
What is known about making such projections readable rather than
noisy?

### 2.2 Natural-language renderings: controlled natural languages

A controlled natural language (CNL) is a designed subset of a natural
language with a formal grammar — English-shaped sentences a machine
can parse unambiguously. The field is large and old:

- Kuhn's survey ("A Survey and Classification of Controlled Natural
  Languages," *Computational Linguistics* 40(1), 2014) catalogs 100
  English-based CNLs since 1930 and places them on a continuum
  between full English and propositional logic. Its design lesson:
  CNLs are engineered points on a precision/naturalness tradeoff, and
  where a language sits should be a deliberate choice.
  (MEASURED/literature; abstract + survey page read.)
- Attempto Controlled English (ACE) is the canonical
  machine-translatable CNL — a formal language with English syntax,
  translating to first-order logic. (PRACTICE/literature.)
- **The measured result that matters here:** Kuhn's evaluation
  framework (ontographs — subjects judge statements true/false
  against a picture) compared ACE against Manchester OWL Syntax, a
  comparable formal notation. The CNL was easier to understand,
  needed less learning time, and was better accepted by users.
  (MEASURED, abstract tier — "How to Evaluate Controlled Natural
  Languages," arXiv:0907.1251, and the Springer evaluation-framework
  chapter.)

Bearing on the kernel: the prose projection should be a *controlled*
rendering — a fixed sentence pattern per generator and per refusal,
generated from the grammar — not free prose. The CNL literature says
the payoff is real (comprehension, learning time) and warns of the
known trap: CNL *writability* is much harder than readability (human
authors struggle to stay inside the fence; tool support is what made
ACE usable). The kernel dodges the trap because agents author in the
wire or TS projection, and prose is read-only teaching surface —
which is exactly the posture the CNL evidence favors. (SYNTHESIS.)

### 2.3 One abstract syntax, many concrete syntaxes: Grammatical Framework

The Grammatical Framework (GF) is the strongest single piece of prior
art for §5.6's "one AST, three projections":

- A GF grammar is one **abstract syntax** (a typed tree language,
  built on a logical framework) plus any number of **concrete
  syntaxes** mapping trees to strings — bidirectionally: strings
  parse to trees, trees linearize to strings. Concrete syntaxes can
  be natural languages *or formal languages*; translating between a
  logic and English is a standard GF application. The Resource
  Grammar Library implements one shared abstract syntax across ~30
  natural languages. ("Abstract Syntax as Interlingua," *Computational
  Linguistics* 46(2), 2020; GF literature. PRACTICE/literature —
  primary papers identified, not read in full this session.)

Bearing: the kernel's language declaration (§7.1 of the design record)
is a GF-shaped object — the abstract syntax as cataloged data, with
wire/TS/prose as concrete syntaxes. GF's thirty years say the shape is
sound and name the discipline that keeps it sound: concrete syntaxes
must be *linearizations of the one tree*, never parallel authored
artifacts — precisely the estate's served-equals-derived wall.
(SYNTHESIS.) GF also demonstrates the bidirectional ambition is
achievable but expensive; the kernel only needs the linearization
direction for prose, which is the cheap half. (SYNTHESIS.)

### 2.4 TypeScript embeddings: how typed DSLs live in TS

What the surveyed libraries (Zod, Effect Schema, io-ts, tRPC, Kysely,
XState) collectively establish, all PRACTICE tier:

- **Branded/phantom types are the standard answer to TS's structural
  typing.** TS treats two same-shaped types as identical, so a
  `UserId` string and a `ProductId` string interchange silently. The
  community-standard fix is the brand: intersect the base type with a
  phantom marker (`string & { __brand: "UserId" }`). Zod ships it as
  `.brand<"...">()` (validation and branding in one parse step);
  Effect Schema and Valibot expose equivalent operators; io-ts has
  branded codecs. Brands are compile-time only — erased at runtime —
  which matches the kernel's posture (the runtime check is the
  admission door; the brand is authoring-time DX). (PRACTICE —
  Zod docs, learningtypescript.com, multiple current practitioner
  write-ups.)
- **The parse step is where brands are minted.** The "parse, don't
  validate" discipline (§5.2 below) is what these libraries implement:
  a `Digest<"schema">` should only be constructible by the SDK's
  decode/admission path, never by casting. That is exactly the
  two-layer split the kernel model already has (candidate → door →
  intrinsic). (SYNTHESIS on PRACTICE.)
- **Refusal/error channels:** the surveyed libraries split into
  throw-based (Zod's `.parse` throws; `.safeParse` returns a tagged
  union) and typed-error-channel designs (Effect's `Effect<A, E, R>`
  carries the error type; io-ts returns `Either`). The observable
  trend line runs toward typed, value-level errors — Zod added
  `safeParse` precisely because throwing lost type information. The
  kernel's refusals-as-values on Effect's error channel is the
  current best practice, not an eccentricity. (PRACTICE.)
- **Builder fluency:** Kysely (SQL) and XState (statecharts) are the
  reference points for deep typed builders. Both show the same
  pattern: the builder's method chain mirrors the grammar of the
  target language, and type inference carries context forward so
  illegal continuations fail to type-check — grammar-as-builder. Both
  also show the cost: error messages at the point of a type mismatch
  in a deep generic chain are notoriously hard to read. (PRACTICE;
  the error-noise cost is community consensus, LEAD tier for any
  specific number.)

What makes TS projections readable vs noisy, distilled from the
above (SYNTHESIS): (1) brands carry domain meaning into signatures —
`Digest<"policy">` in a tooltip is documentation; (2) noise
accumulates in *inferred* generic error output, so the projection
should keep generic depth shallow and name intermediate types (the
generated-signature discipline already in the design record); (3) the
builder should expose the algebra's own vocabulary as method names —
the eight plain words — because the signature is the teaching surface.

---

## 3. Area 2 — transport and LLM population of the wire

### 3.1 What is actually measured about tool calling

- **Failure taxonomies.** Synthesis surveys of tool-use benchmarks
  (BFCL and successors, ToolBench-family, API-Bank-family) classify
  recurring failures: wrong function selected, wrong argument
  *names*, wrong argument *values*, wrong types, hallucinated
  function names, invalid output format. BFCL's own error analysis
  buckets errors as failure to understand environment state, the
  function documentation, or the user request. (MEASURED, abstract
  tier — "Beyond the Leaderboard," arXiv:2607.05775; BFCL
  materials.)
- **Paradigm effects are larger than name effects in the recent
  literature.** "The Bitter Lesson of Tool Calling" (arXiv:2608.06370,
  read in full this session): across 14 models on 309 BFCL v4
  entries, letting models write code against typed stubs matched or
  beat JSON tool calling for 11/14 models; the advantage grows with
  sequential chain depth (+18.8% absolute at 12+ calls), holds
  perfect fan-out at 100 parallel calls where JSON baselines drop
  calls above ~70, and is robust to context flooding (+5.5% vs −2.3%).
  (MEASURED.) Relatedly, recent benchmark syntheses report *format
  and prompt engineering* as dominant variance sources in tool-calling
  benchmarks. (LEAD — seen in search synthesis, primary not read.)
- **A clean public ablation isolating tool-NAME quality was not
  found.** The evidence that names and descriptions matter is real
  but indirect: EASYTOOL (NAACL 2025) shows restructuring tool
  documentation into concise standardized instructions with examples
  improves tool-use performance and reduces tokens (MEASURED,
  abstract tier); Anthropic reports internal evals where
  Claude-optimized rewrites of tool descriptions beat human-written
  ones (PRACTICE — graphs shown, numbers not published). Honest
  statement for the grill: *"descriptions matter" is measured;
  "which naming convention is best" is practice.*

### 3.2 Vendor and spec practice (PRACTICE tier throughout)

Anthropic, "Writing effective tools for agents — with agents"
(anthropic.com/engineering, 2025-09-11, read this session):

- Parameters "unambiguously named: instead of a parameter named
  `user`, try `user_id`." Resolve "arbitrary alphanumeric UUIDs to
  more semantically meaningful and interpretable language" — return
  names, not bare identifiers, where possible.
- Namespace tools by service/resource prefix; the choice of prefix-
  vs suffix-namespacing had "non-trivial effects on tool-use
  evaluations."
- "Small refinements to tool descriptions can yield dramatic
  improvements." Describe the tool as to a new team member; include
  examples of correctly formatted inputs; make errors actionable.
- Return high-signal, token-frugal responses; offer concise/detailed
  response formats.

MCP specification lineage: tool = name + description + JSON Schema
`inputSchema`. As of the 2026-07-28 release candidate (MCP blog, read
this session), `inputSchema`/`outputSchema` are lifted to **full JSON
Schema 2020-12** — the `type: "object"` root constraint remains for
inputs, but composition (`oneOf`/`anyOf`/`allOf`), conditionals, and
`$ref`/`$defs` are now allowed; implementations must not
auto-dereference external `$ref`s and should bound schema depth. A
pending spec SEP (SEP-1382) is standardizing documentation practice:
tool descriptions carry high-level function, schema descriptions
carry parameter-specific detail with formats, limits, and units
("ISO 8601 date, such as 2026-07-05" rather than "date"). MCP tool
annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`)
are the wire's place for act semantics. (PRACTICE.)

OpenAI structured outputs: supports a JSON Schema *subset*; notably,
constraint keywords like `pattern`, `format`, `minimum`, `minLength`
are **not enforced** by the sampler — the schema constrains structure,
not content — `additionalProperties: false` is required, and defaults
are rejected. (PRACTICE — OpenAI/Azure docs via search; specifics
verified against Microsoft Learn summary, primary doc not fetched;
treat keyword-level details as PRACTICE with LEAD edges.)

### 3.3 Schema shapes LLMs populate reliably vs unreliably

- **Reliable regime:** flat objects, few properties, shallow nesting,
  small enums, no cross-field constraints. JSONSchemaBench
  (arXiv:2501.10868, EPFL/Microsoft — ~10k real-world schemas, six
  engines): simple schemas are handled near-uniformly well; on the
  hardest real-world class (deep nesting + pattern constraints +
  unions), engine coverage collapses — secondary reporting of the
  paper's numbers has all frameworks >86% on simple schemas falling
  to 41%/39%/28%/3% (Guidance/Llamacpp/XGrammar/Outlines) on
  "Github-Hard." (MEASURED, abstract tier; the specific collapse
  numbers are via a secondary write-up — LEAD until read against the
  paper's tables.)
- **Format restriction itself has a cost.** "Let Me Speak Freely?"
  (EMNLP Industry 2024): stricter format constraints degrade
  reasoning-task performance versus free-form answers. (MEASURED,
  abstract tier.) Design consequence: don't spend schema strictness
  where the door can check instead — the estate's admission door
  means wire schemas can stay loose-but-shaped, with law enforcement
  at admission, which is the cheaper split for model performance.
  (SYNTHESIS.)
- **Unions and indirection:** discriminated unions (`oneOf` with a
  tag) are the hardest widely-used construct for constrained decoders
  and codegen alike (§4.3); `$ref` indirection is now legal on the
  MCP wire but several ecosystems inline or forbid it. Nothing found
  measures LLM *population* accuracy on `oneOf` in tool arguments
  specifically — a measurable gap (§7). (SYNTHESIS + PRACTICE.)
- **Identifier-valued parameters are a documented hazard.**
  Practitioner and survey material converges: under-specified ID
  parameters get format-hallucinated ("the user's ID" without format
  → model invents one), and hallucinated identifiers are a real
  production failure class. (PRACTICE/LEAD — practitioner posts; the
  taxonomy papers give it MEASURED abstract-tier support as
  "incorrect argument values.") The kernel's mitigation is already
  structural: digests are verify-on-read and the door refuses
  non-admitted references, so a hallucinated digest cannot bind —
  the cost is a retry, not a wrong act. Worth saying on outward
  pages. (SYNTHESIS.)

### 3.4 The semantic-alignment worry: metadata names vs data values

Direct literature on "will a model confuse the field *named* `schema`
with the schema it *names*": **none found** — searched across
function-calling, structured-output, and prompt-robustness venues.
Nearest neighbors, each one hop away:

- **Text-to-SQL schema linking.** Binding request tokens to the right
  schema element is a first-class, heavily-studied failure mode;
  error studies report lexical ambiguity (one phrase matching
  multiple schema items) and name/value confusion (querying "New York
  City" where the data stores "NYC") among the dominant error
  classes, and schema-linking errors as catastrophic-when-wrong.
  Adding column *descriptions* measurably helps. (MEASURED, abstract
  tier — "A Study of In-Context-Learning-Based Text-to-SQL Errors,"
  arXiv:2501.09310; AmbiSQL, arXiv:2508.15276; column-description
  study, arXiv:2408.04691.) Transfer reading: models do confuse
  same-named things across the metadata/data boundary when context
  under-determines them, and short descriptions at the point of use
  are the demonstrated mitigation.
- **Tool-calling taxonomies** put wrong-argument-name and
  wrong-argument-value among the recurring failures (§3.1) — the
  confusion class exists on the tool wire, unquantified for this
  specific shape.
- **Reserved-word collisions are real engineering, not hypothesis.**
  pydantic hard-errors on a model field named `schema` ("Field name
  "schema" shadows a BaseModel attribute"), forcing `schema_` +
  alias; codegen tools hit this repeatedly downstream (PRACTICE —
  pydantic issue tracker, ariadne-codegen #191). A field named
  `schema` will also collide conceptually inside JSON-Schema-touching
  toolchains where `schema`/`$schema` mean the metaschema.
  (SYNTHESIS on PRACTICE.)

The lean, stated plainly (SYNTHESIS): the worry is legitimate but has
a cheap, convention-backed repair — self-descriptive compound field
names that name the *value's* type, not the referent's kind:
`schema_digest` (or `schema_ref`), `policy_digest`, `program_digest`.
This matches Anthropic's `user`→`user_id` rule, the MCP SEP's
formats-in-descriptions practice, and sidesteps the pydantic-class
collision entirely. The kind word alone (`schema:`) does triple duty
— kind name, field name, JSON-Schema house word — and naming research
(§5.3) counts that against it.

### 3.5 LLM-population summary for the grill

The eight-generator wire sits squarely in the measured reliable
regime: few tools, flat schemas, small closed enums, string-typed
digest slots. The two live risks the external record flags are (1)
`oneOf`-shaped polymorphic slots, if any surface at the wire, and
(2) under-described digest parameters. Both have named mitigations
(avoid wire-level unions where the kind is statically known; put
format + example + kind sentence in every digest parameter
description). Where evidence is thin — name-quality ablations, the
metadata/data confusion — the honest posture is to measure in-house
with generated vectors (§7, Q1–Q2). (SYNTHESIS.)

---

## 4. Area 3 — encoding and overloading

### 4.1 Overloaded vs distinct names across contexts

External evidence, all pointing one direction:

- Deissenboeck & Pizka, "Concise and Consistent Naming" (*Software
  Quality Journal* 14, 2006): identifiers are ~70% of source text;
  the paper's formal model demands a **bijective mapping between
  concepts and names** — one name per concept, one concept per name —
  as the foundation of comprehensibility. (MEASURED/literature,
  abstract tier.)
- Identifier-comprehension studies: full words beat abbreviations
  and single letters for comprehension speed (Hofmeister et al.,
  *EMSE* 2019: ~19% faster defect finding with word identifiers;
  Lawrie et al. 2006/2007: full words best, abbreviations often
  statistically indistinguishable). (MEASURED, abstract tier.)
  This validates the estate's plain-words rule and the
  `reduction`-not-coinage instinct.
- The text-to-SQL lexical-ambiguity result (§3.4) is the LLM-side
  version of the same law: one word meaning several things in scope
  is precisely the documented confusion trigger. (SYNTHESIS.)

When is overloading clarifying? The practice answer from API design:
when every occurrence denotes the *same concept at the same level* —
`fold` the generator, `fold` the declared reduction, `fold` in prose
all point at one concept, and that repetition teaches. When the
occurrences straddle a level boundary — `schema` the kind vs `schema`
the field holding a digest vs `$schema` the metaschema — the same
word denotes three concepts, breaking the bijection. Lean: keep
one-word names where the referent is one concept; compound the field
names where levels cross. (SYNTHESIS.)

### 4.2 Representing branded references in JSON Schema

The design space, in the serde vocabulary (Rust's serialization
framework, whose four enum representations are the standard names —
serde.rs enum-representations page, PRACTICE):

| Option | Wire shape | External evidence |
| --- | --- | --- |
| Plain branded string | `"schema_digest": "b3:9f2c..."` with `pattern` (+ format note in description) | Simplest for constrained decoding (JSONSchemaBench: pattern-heavy schemas cost engines, but a single anchored pattern on a string is the cheap end); OpenAI sampler won't *enforce* `pattern`, so the door remains the real check (§3.2). The field name carries the brand. |
| Externally tagged | `{"schema": "b3:..."}` — variant name as the one key | serde's default; self-describing; but at a *field* position it produces the exact `schema:` metadata/data pun the operator worries about. |
| Internally tagged | `{"kind": "schema", "digest": "b3:..."}` | serde `tag="kind"`; the OpenAPI `discriminator` convention is this shape (discriminator property must exist in every variant, string-typed, mapped to schema names — Swagger/Redocly docs). Costs nesting depth and per-call tokens; buys runtime kind-dispatch where the slot is polymorphic. |
| Adjacently tagged | `{"kind": "schema", "content": {...}}` | serde `tag`+`content`; standard where content shape varies wholly by tag — the natural shape for KM-12's per-kind `KindContent` at the wire, not for mere references. |

Two relevant cautions from practice: OpenAPI's `discriminator` is
formally *redundant* — validation is fully determined by the `oneOf`
alternatives; the discriminator is a codegen/dispatch hint, and a
current practitioner critique ("The Discriminator in OpenAPI Is
Generally Redundant & Confusing," Bump.sh) documents persistent
confusion and codegen bugs around it (OpenAPITools #21801).
(PRACTICE.)

Lean (SYNTHESIS): where the kind is **statically known from the
field** — which is everywhere in the eight generators' signatures,
since sorts are fixed per slot — the tagged object buys nothing the
schema doesn't already say, and costs nesting, tokens, and a
discriminator's confusion surface. Plain string + compound field name
+ pattern + described format is the evidence-side choice. Reserve
internally/adjacently tagged objects for genuinely kind-polymorphic
slots (if the wire ever has one, e.g. a heterogeneous reference
list), and then use the OpenAPI `discriminator` *convention* (a
`kind` property naming the variant) since it is what agent-adjacent
tooling has seen most.

### 4.3 Canonical bytes at the wire: opaque string vs structured object

The estate's canonical values already have exactly one byte form
(RFC 8785-style canonicalization) and digests are derived from those
bytes. External practice on the wire choice:

- Content-addressed systems that expose digests on JSON wires (git
  APIs, OCI registries, IPFS) uniformly surface them as **prefixed
  opaque strings** (`sha256:...`), with structure documented, not
  decomposed into objects. (PRACTICE — uniform convention;
  no single citable spec read this session, LEAD at the edges.)
- The decomposed form's one advantage — machine-checkable kind — the
  kernel already gets from the branded slot plus the admission door.
  (SYNTHESIS.)

Lean: opaque prefixed string at the wire; the *value* behind it is
fetched by `resolve`, never inlined as a structured object in a
reference position. (SYNTHESIS, consistent with the design record's
existing shape.)

### 4.4 No floats: friction findings

The canonical value grammar admits non-negative safe integers and no
floats. External record:

- **The precedent is exact.** RFC 7493 (I-JSON): senders cannot
  expect receivers to treat integers outside ±(2^53−1) exactly;
  interoperable JSON *is* the safe-integer profile the estate chose.
  Anything larger belongs in strings (the RFC's own recommendation
  for 64-bit values). (PRACTICE/spec, RFC text confirmed via
  rfc-editor search result.)
- **JSON Schema tooling friction is mild and known.** `type:
  "integer"` is universally supported; the frictions are (a)
  validators differ on whether `1.0` matches `integer`
  (draft-dependent "integral value" semantics), (b) `minimum: 0`
  is unenforced by OpenAI-style samplers (structure-not-content
  again, §3.2), and (c) languages with only doubles (JS `number`)
  silently pun integer and float — which TS branding
  (`NonNegativeSafeInt` brand) papers over at authoring time.
  (PRACTICE; (a) is LEAD-tier detail.)
- No evidence was found that *absence* of floats harms LLM
  population; if anything the structured-output literature's trouble
  spots (patterns, unions, depth) don't include integers.
  (SYNTHESIS on absence.)

---

## 5. Area 4 — DSL and language-design practice bearing on the KM items

### 5.1 Refusal/error design

- Becker et al., "Compiler Error Messages Considered Unhelpful"
  (ITiCSE WG 2019): fifty years of error-message research distilled;
  programmers do read messages; effective messages locate the
  problem, explain it in the user's terms, and propose the repair.
  (MEASURED/literature — report identified and its guidelines
  confirmed across summaries; full report not re-read this session.)
- Rust: a study of enhanced Rust error messages measured
  significantly better comprehension scores and improved debugging
  performance from messages carrying more facilitating information
  ("The Usability of Advanced Type Systems: Rust as a Case Study,"
  arXiv:2301.02308 vicinity — MEASURED, abstract tier). Rust's
  diagnostic *structure* (error code + span + explanation + suggested
  fix, machine-applicable suggestions) is the industrial reference
  implementation of taught repairs. (PRACTICE.)
- Elm's error philosophy (errors as teaching, one error at a time,
  concrete fix candidates) is the acknowledged design leader that
  Rust itself credits. (PRACTICE.)

Bearing: the estate's refusal shape — reason + defended law + legal
next move, as data — is the Rust/Elm shape with the repair made
machine-readable, aimed at a reader (an LLM) that demonstrably
responds to actionable error text (Anthropic guidance, §3.2). One
external addition worth stealing: Rust's *machine-applicable
suggestion* distinction — marking which `next` moves are mechanically
executable vs advisory. (SYNTHESIS.)

### 5.2 Closed grammars and "make illegal states unrepresentable" at API scale

The principle (Minsky, 2010) and its boundary discipline ("Parse,
don't validate," King, 2019) are established industrial practice with
a large derivative literature; the pattern "parse at the boundary
into types that cannot represent invalid values, then never re-check"
is precisely the kernel's candidate→door→intrinsic split, and the
external framing adds one useful sentence for outward pages: the
admission door is the *parser* in King's sense, and refusals are its
parse errors. (PRACTICE + SYNTHESIS.) Where it has "worked at API
scale": the strongest public exemplars are typed-DSL APIs (Kysely,
XState, tRPC — §2.4) and protocol-level examples like capability
systems; the survey found no counter-literature arguing closed
grammars harm API usability — the recurring cost cited is evolution
(closed unions force versioned growth), which the estate has already
priced via language successor declarations (KM-12's companion
reading). (SYNTHESIS.)

### 5.3 Naming discipline

Covered in §4.1; the distilled bearings: plain full words (measured),
one-name-one-concept bijection (literature), descriptions at point of
use (measured in the SQL-schema neighbor). Against coinage; against
cross-level overloading; for compound field names.

---

## 6. Considerations for the visual (DAG) lane

### 6.1 What the visual-languages literature establishes

- **The scaling-up problem is the field's own name for its central
  failure.** Burnett et al., "Scaling Up Visual Programming
  Languages" (*IEEE Computer*, 1995): VPLs demo beautifully and
  degrade beyond small programs unless the language re-introduces
  the abstraction machinery it tried to remove. (MEASURED/literature,
  paper identified and thesis confirmed.) The practitioner form is
  Blueprint/node-editor "spaghetti" — workspace clutter growing
  super-linearly with program size. (PRACTICE/community consensus;
  no single measured study found — LEAD.)
- What makes node surfaces legible where they work (Blockly/Scratch,
  Node-RED, Unreal Blueprints as practice exemplars): a small closed
  node vocabulary; typed ports so illegal wires won't connect (the
  visual form of unrepresentability); sub-graph encapsulation
  (functions/macros) as the anti-spaghetti device; and consistent
  left-to-right/top-down dataflow direction. (PRACTICE.) Blockly's
  own design lesson — blocks constrain *syntax* so errors shift from
  syntactic to semantic — transfers directly: a DAG surface over the
  kernel gets its legality from the sorts, not from layout.
  (SYNTHESIS.)

### 6.2 LLMs and graph-shaped program representations

- "Talk like a Graph" (ICLR 2024): graph→text encoding choice alone
  moves LLM accuracy on graph reasoning by 4.8%–61.8%; incident-list
  encodings win most tasks; global graph properties stay hard.
  (MEASURED, abstract tier + Google Research blog.)
- ComfyBench (CVPR 2025, project page read): best agents solve 32.5%
  of 200 real workflow-construction tasks (15% of creative ones);
  and **code beats JSON/graph formats** as the generation
  representation — "Turing completeness, rich semantic information,
  and natural compatibility with LLMs' code generation." Successor
  systems (ComfyGPT) improved by generating *individual link
  connections* rather than whole graphs. (MEASURED.)
- "The Bitter Lesson of Tool Calling" (§3.1) is the same finding on
  the tool wire: linear code composes better than nested JSON as
  chains deepen. (MEASURED.)

### 6.3 The lean for the estate's DAG ambition

Three convergent external facts — node surfaces spaghettify when
authored at scale, LLMs emit graphs poorly but code well, and
encoding choice dominates LLM graph *reading* — point at one posture
(SYNTHESIS): make the DAG a **read/audit projection** (a fourth
projection of the one AST, generated like prose — a program
declaration's `nodes`/`edges` already contain everything a layout
needs), and keep agent *authoring* on the linear grammar (wire or
builder). If a visual *authoring* surface is ever wanted for humans,
the literature's requirements are already met by the kernel's bones:
typed ports = branded sorts, closed node vocabulary = eight
generators, encapsulation = child programs by digest. The one design
choice the LLM-reading evidence dictates now: when a DAG is rendered
*to* an agent as text, use an incident-style encoding (per-node "X
feeds Y, Z" lines — which the `uses` lists already are), not an
adjacency matrix or edge soup. (SYNTHESIS on MEASURED.)

---

## 7. Per-KM bearing table

"Leans" = which way the external record points; it is not a ruling.

| KM | External bearing | Lean |
| --- | --- | --- |
| KM-1 two-layer realization (intrinsic + candidate + one door) | "Parse, don't validate" / "make illegal states unrepresentable" is exactly this architecture as industrial practice (§5.2); TS schema libraries implement it (§2.4). | Supports: keep. The door is the parser; the refusals are its errors. |
| KM-2 anchor type indices (fold digest, partition) | Branded/phantom-type practice (§2.4): brands are cheap at authoring time, erased at runtime; unit-space indexing is the same device. No external cost signal found. | Supports keeping; external record adds nothing against. |
| KM-3 abstract carriers vs fabric import | No external bearing found — packaging/trusted-base question internal to the estate. | — |
| KM-4 compose the two doors | No direct external bearing; weakly, single-parser-at-the-boundary practice (§5.2) favors one door over two. | Weakly supports composing. |
| KM-5 refusal priority ruling | Error-message research (§5.1): deterministic, most-specific-first diagnostics are practice (Rust reports one primary error per root cause; Elm one-at-a-time). Two conforming doors teaching different repairs is the documented confusion class. | Supports ruling the order as contract, and publishing it in the refusal table. |
| KM-6 trigger world-effect | No external bearing. | — |
| KM-7 spawn's meet | No external bearing. | — |
| KM-8 F13 stated-only posture | No external bearing (overclaim hygiene is house law, not surveyed). | — |
| KM-9 which kind names a cell | Naming bijection (§4.1): one concept, one name — whatever kind is chosen should be the same word at wire, TS, and prose. No bearing on *which* word. | Process support only. |
| KM-10 two extra refusal reasons kept distinct from the fourteen rows | Error-taxonomy practice (Rust error codes namespace by origin) supports keeping door-completeness reasons distinct from closure-law reasons — distinct catalogs, one table. | Supports keeping them distinct and labeled. |
| KM-11 rename `index` → `reduction` | Naming research (§4.1, §5.3): full plain words, one-name-one-concept; `index` carries a search connotation the model doesn't have — exactly the misleading-name class Deissenboeck & Pizka's bijection forbids; `reduction` is a plain word naming the actual concept. LLM-side: lexical ambiguity is the documented confusion trigger (§3.4). | Supports the rename. |
| KM-12 `KindContent` family + kind-enum-as-projection | Per-kind content typing is the adjacently-tagged-union shape, the standard serde/OpenAPI answer to "content varies by tag" (§4.2); kind-table-as-data with generated enum is the GF abstract-syntax-as-data shape (§2.3) and matches MCP's schemas-as-data direction. Closed-union evolution cost is the known price, already answered by language successor declarations. | Supports both halves. The wire caveat: if `declare`'s input ever surfaces per-kind content as a `oneOf` across twelve kinds, that is the one place the wire would leave the reliable regime (§3.3) — prefer kind-specific tools or a statically-kinded slot at the wire. |

Operator survey questions not tied to a KM number:

| Question | Bearing |
| --- | --- |
| `schema` field-name/value confusion | No direct study (finding). Nearest neighbors + practice → compound self-descriptive field names (`schema_digest`); measure in-house (§3.4, §8 Q1). |
| Prose projection viability | CNL evidence: measured comprehension/learning-time wins; GF: the multi-projection architecture at scale (§2.2–2.3). Strongly supported, read-only posture. |
| Digest representation at wire | Prefixed opaque string + pattern + described format; tagged object only for kind-polymorphic slots (§4.2–4.3). |
| No-floats friction | I-JSON is the exact precedent; friction mild; nothing LLM-side found against (§4.4). |

---

## 8. Open questions the survey could not settle — grill-ready

- **Q1 (measure, don't debate).** Does a field named `schema` (bare)
  vs `schema_digest` vs `{kind, digest}` measurably change population
  accuracy for our models on our tools? No published answer exists.
  This is a one-day in-house eval in the estate's own
  generated-vectors discipline: same tool, three schema spellings,
  planted tasks, count wrong-slot and format-hallucination rates.
  The survey's lean (`schema_digest`) is convention, not evidence,
  until this runs.
- **Q2.** Do per-parameter examples in descriptions (MCP SEP-1382
  practice) measurably reduce digest-format hallucination for us?
  Same eval harness, cheap to add.
- **Q3.** If KM-12's per-kind content ever reaches the wire: one
  `declare` tool with a `oneOf` body, twelve kind-specific tools, or
  one tool per kind-family? External evidence flags `oneOf` as the
  risk regime but has no numbers for tool-argument unions
  specifically. Grill should also weigh tool-count budget (vendor
  practice: fewer, well-named tools).
- **Q4.** Prose projection register: the CNL literature measures
  comprehension for *humans*; no study measures whether LLM agents
  act more lawfully after reading a controlled-language rendering vs
  a schema dump. The bootstrap self-containment gate (§7.3 of the
  design record) is already the right experiment — worth adding a
  prose-vs-schema arm when it runs.
- **Q5.** The DAG projection's text encoding: "Talk like a Graph"
  says encoding choice dominates, and favors incident encodings —
  but it measured abstract graph puzzles, not program DAGs. If/when
  the visual lane opens, a small reading-comprehension eval over
  program declarations (incident vs edge-list vs rendered-code
  forms) would settle the estate's own case.
- **Q6.** Sampler-unenforced constraints (OpenAI ignores `pattern`/
  `minimum`): does the estate document, per wire schema, which
  constraints are sampler-enforced vs door-enforced? Not a design
  change — a docs/teaching-frame decision the grill can settle now.

---

## 9. Source list

Fetched and read this session (primary):

- "The Bitter Lesson of Tool Calling," Patel, Sen, Lumer, Subbiah
  (PwC), arXiv:2608.06370, 2026-08-06. https://arxiv.org/html/2608.06370
- "Writing effective tools for agents — with agents," Anthropic
  engineering blog, 2025-09-11.
  https://www.anthropic.com/engineering/writing-tools-for-agents
- "The 2026-07-28 MCP Specification Release Candidate," Model Context
  Protocol blog.
  https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/
- ComfyBench project page (CVPR 2025; arXiv:2409.01392).
  https://xxyqwq.github.io/ComfyBench/

Verified at abstract/summary tier (primary identified, not read in
full):

- JSONSchemaBench: "Generating Structured Outputs from Language
  Models: Benchmark and Studies," Geng et al., arXiv:2501.10868.
- "Let Me Speak Freely? A Study on the Impact of Format Restrictions
  on Performance of Large Language Models," Tam et al., EMNLP
  Industry 2024, arXiv:2408.02442.
- "EASYTOOL: Enhancing LLM-based Agents with Concise Tool
  Instruction," NAACL 2025, arXiv:2401.06201.
- "Beyond the Leaderboard: A Synthesis of Tool-Use, Planning, and
  Reasoning Failures in LLM Agents," arXiv:2607.05775.
- BFCL — Berkeley Function-Calling Leaderboard materials (OpenReview
  paper; inspect_evals writeup).
- "Talk like a Graph: Encoding Graphs for Large Language Models,"
  Fatemi, Halcrow, Perozzi, ICLR 2024, arXiv:2310.04560; Google
  Research blog summary.
- "A Study of In-Context-Learning-Based Text-to-SQL Errors,"
  arXiv:2501.09310; AmbiSQL, arXiv:2508.15276; "Synthetic SQL Column
  Descriptions and Their Impact on Text-to-SQL Performance,"
  arXiv:2408.04691.
- Tobias Kuhn, "A Survey and Classification of Controlled Natural
  Languages," Computational Linguistics 40(1), 2014 (ACL J14-1005);
  "How to Evaluate Controlled Natural Languages," arXiv:0907.1251;
  "An Evaluation Framework for Controlled Natural Languages,"
  Springer 2010.
- "Abstract Syntax as Interlingua: Scaling Up the Grammatical
  Framework," Ranta et al., Computational Linguistics 46(2), 2020.
- Becker, Denny, et al., "Compiler Error Messages Considered
  Unhelpful," ITiCSE WG Reports 2019 (ACM 10.1145/3344429.3372508).
- "The Usability of Advanced Type Systems: Rust as a Case Study,"
  arXiv:2301.02308 (enhanced-diagnostics measurement).
- Hofmeister, Siegmund, Holt, "Shorter identifier names take longer
  to comprehend," EMSE 2019; Lawrie, Morrell, Feild, Binkley,
  "What's in a Name? A Study of Identifiers," ICPC 2006 / "Effective
  identifier names for comprehension and memory," 2007.
- Deissenboeck & Pizka, "Concise and Consistent Naming," Software
  Quality Journal 14, 2006.
- Burnett et al., "Scaling Up Visual Programming Languages," IEEE
  Computer, 1995.
- ComfyGPT, arXiv:2503.17671; ComfyMind, arXiv:2505.17908
  (workflow-generation follow-ons).
- MermaidSeqBench, arXiv:2511.14967 (NL-to-diagram generation
  benchmark).

Practice/spec sources:

- MCP specification (modelcontextprotocol.io, 2025-11-25 rev) and
  SEP-1382 "Documentation Best Practices for MCP Tools"
  (modelcontextprotocol GitHub issue #1382).
- OpenAI structured outputs docs (developers.openai.com; Microsoft
  Learn structured-outputs page for the Azure statement of subset
  limits).
- serde enum representations, https://serde.rs/enum-representations.html
- OpenAPI discriminator: Swagger inheritance-and-polymorphism docs;
  Redocly discriminator guide; "The Discriminator in OpenAPI Is
  Generally Redundant & Confusing," Bump.sh; OpenAPITools
  openapi-generator issue #21801.
- RFC 7493, "The I-JSON Message Format,"
  https://www.rfc-editor.org/rfc/rfc7493.html
- Zod docs (zod.dev — `.brand`); "Branded Types," learningtypescript.com;
  practitioner branded-type write-ups (oneuptime.com 2026-01-30,
  dev.to).
- pydantic issue tracker (field named `schema` shadows BaseModel
  attribute; ariadne-codegen #191 downstream).
- DevIQ, "Parse, Don't Validate" and "Make Illegal States
  Unrepresentable" (principle summaries; Minsky 2010, King 2019
  originals).

Lead-tier (found, not verified):

- Format/prompt engineering as dominant variance in tool-calling
  benchmarks (seen in survey synthesis only).
- JSONSchemaBench per-engine collapse numbers (86% → 41/39/28/3%)
  via secondary write-up (beancount.io research log).
- Blueprint-spaghetti as a measured (rather than anecdotal)
  phenomenon — no study found.
- Production hallucinated-identifier rates (practitioner posts).

# APIs as algebra: the expressibility principle, the eight access patterns, and the plane-layered surface

Status: EXPLORATORY consultation note, coordinator-written 2026-08-18
at the operator's direction, third companion in the session's set —
beside the CAS-motion note
(scratch/research/2026-08-18-cas-motion-and-ingress.md) and the
algebra-engine note
(scratch/research/2026-08-18-algebra-engine-architecture.md). It
carries the operator's newly stated first-class principle, grounds it
in what is already ratified, breaks the substrate's access patterns
into estate primitives, and derives the code organization. Nothing
here is adopted; §7 hands its rows to the DEV-772 grill. Standing
fences ride: safety only; attribution fence; meaning/carriage split
throughout.

## 0. The principle, in the operator's sentence and then precisely

> All APIs should be expressible as algebraic constructs, and so in
> turn expressible in the estate meta-language — lean proof → algebra
> → AST → {dsl, code, prose, mcp} — meaning we aim to have almost all
> APIs be fluent compositions of the algebraic constructs they model,
> and so maintain machine, human, and LLM parity in understanding.
> This is how we guarantee agent-first is a truth as much as any dot
> in the CAS.

Stated as an admission rule over the API surface itself:

**Every public API names its denotation: a composition term in the
estate meta-language. The fluent surface is generated sugar over that
term, and the term — not the sugar — is what the projections share.**

Three consequences, each checkable rather than aspirational:

1. **Parity is a digest equality.** The LLM reads the MCP projection,
   the human reads the prose or the fluent code, the machine executes
   the AST — and all three are images of one declaration with one
   digest. "Do these three understand the same thing" stops being a
   review question and becomes served-equals-derived, the wall class
   the estate already runs for tool descriptions.
2. **A fluent method with no denotation is refused, not shipped.** If
   a proposed API cannot be written as a composition of the eight
   generators, declared algebras, and ruled combinators, it is either
   carriage (fence it behind the environmental band, where it never
   claims meaning) or a missing algebraic construct (a grill item
   under the K-1 growth discipline). The refusal mirrors the
   hand-written-tool-list refusal: a hand-written API is a second
   assembler in miniature.
3. **Agent-first is constructional.** An agent's surface is not a
   port of the human surface; both are projections of the same term.
   The agent cannot be second because there is nothing first except
   the algebra.

## 1. What is already ratified, so this note composes rather than invents

- **One AST, three projections** — the kernel record's §5.6: the
  grammar is stated once and projected; `render = assemble ∘ compile`
  is law; a parsed math-DSL or any second assembler is refused.
- **The dual construction** — §6.3: authoring in Effect constructs
  the program declaration and the executable together; the fluent `$`
  surface compiles to cataloged data.
- **Shipped evidence of 100% fidelity** — kernel.ts,
  tools.schema.json, prose.md, each a full-cardinality image of the
  model, with KM-13 owing the emitter wall that keeps them honest.
- **KM-18** — notation as projection register; generated JSDoc reaches
  agents through Effect Schema annotations → JSON Schema → the MCP
  tool surface with no human in the path.
- **ADR-0010, the lawful surface** — a public function enters a
  library only with the law that licenses it; the principle extends
  this from "licensed by a law" to "denoted by a term."
- **AE §1** — three surfaces, one door: semantic coherence is
  inherited, never maintained.

The delta this note carries to the grill: those rulings cover the
kernel language. The principle extends them to **the whole public
surface** — affordances, frontier reads, placement resolution, the
measurement catalog, future service faces.

## 2. The eight access patterns

Everything any caller does to the substrate reduces to eight
patterns. Each is licensed by a generator, lands at a known cost
tier (the algebra-engine note's ladder), and names the NATS carriage
that serves it — carriage the pattern's signature never mentions.

| # | Pattern | Generator | Denotation shape | Carriage (never in the signature) | Tier |
|---|---|---|---|---|---|
| 1 | Mint | `declare` | candidate → door → dot (+ placement fact) | CAS carrier put; KV/stream per kind | T0 + T2/T3 |
| 2 | Fetch by identity | `resolve` | digest → verified bytes; placement-hinted | direct get / object store / any carrier | T1 hot, T3 cold |
| 3 | Append at a frontier | `emit` | envelope at a position; msg-id = digest | stream publish | T2 |
| 4 | Merge into a lattice | `join` | read ∘ join ∘ CAS-at-revision (the one loop) | KV update-with-revision | T2 |
| 5 | Read at an anchor | `fold` | anchored reduction; incremental by associativity | consumer step / maintained state | T1 maintained, T3 replay |
| 6 | Decide at a fence | `decide` | fenced outcome at expected position | expected-last-sequence publish / KV revision update | T4 |
| 7 | Watch a frontier | (coalgebra) | consumer step: state → observation × state | pull consumer / KV watch — chatter, recovery by read | T2 push |
| 8 | Attenuate | `spawn` | writ meet | credential selection at connect | T0 |

Reading the table as the principle demands: rows 1–6 and 8 are
already terms — their fluent forms must compile to exactly these
compositions. Row 7 is the one pattern whose meta-language home is
the **coalgebraic half**, which the egress law (AE-4) names and
nothing yet rules; until it lands, watch surfaces ship as chatter
with the recovery-by-read law and make no parity claim. That is the
principle's one honest gap, stated rather than papered over.

## 3. Fluency, fenced

"Fluent composition" earns its place only under three fences:

- **Fluency adds no semantics.** A fluent chain is notation for a
  term; two spellings of one term must produce one digest. The
  bracket-alias discipline (KM-18: aliases are the same function,
  never an overload) is the precedent, generalized.
- **Fluency never hides a plane crossing.** A chain that silently
  moves from meaning to carriage (a `.publish()` that means transport,
  not `emit`) is the confusion the meaning/carriage split exists to
  prevent; carriage configuration lives in options records in the
  environmental band, never in the fluent chain.
- **The chain's type is the term's rung.** KM-17's brands ride the
  fluent surface unchanged: `join` elaborates only at a
  bounded-semilattice carrier whether spelled fluently or not — the
  rung⇒carrier rule cannot be dodged by sugar.

## 4. The module organization the principle forces

Layer by **plane, not by NATS construct** — the plane-aligned layout
(DEV-760 epic) already runs this direction; the principle says why it
is forced: projections are generated per plane, and a module that
mixed planes would need a projection that lies about one of them.

| Plane | Owns | Never contains |
|---|---|---|
| meaning | digests, kinds, sorts, envelopes, refusals, declared algebras | any carrier type (already the ruled discipline) |
| placement | placement facts, the hint-consulting resolver | authority over identity |
| position | lanes, anchors, frontiers (heads, lag) | wall-clock time |
| fence | registers, tokens, incarnation pins | a second decision point |
| coalgebra | consumers, sessions, declared views (DEV-765) | truth writes |
| carriage adapters | one per construct, each exactly three things: a shape gate, transport-absence terms, CAS classification | meaning of any kind |

The adapter row is the transport spine's per-adapter data promoted to
a definition: an adapter IS its shape gate plus its absence terms plus
its CAS classification, and anything more is smuggled meaning.

## 5. The API admission test

For any proposed public surface, in order:

1. **Denote it.** Write the composition term. If it exists, the API
   is that term's generated sugar; its docstring opens with the
   algebraic sentence (Dvořák rule), its projections are emitted, and
   the parity wall byte-compares them.
2. **If no term exists, classify the residue.** Carriage → options in
   the environmental band, fenced out of the fluent surface. Liveness
   → coalgebra hosting, stated as chatter. Genuinely new meaning → a
   grill item; the API waits for the construct, never the reverse.
3. **Never split the difference.** A "mostly algebraic" API with one
   ad-hoc verb is a second assembler wearing a good coat.

## 6. Honest bounds

1. The coalgebraic half is unruled (AE-4 stated-only); watch/view
   parity claims wait on it.
2. Generation cost is real: every projected surface needs an emitter
   and a wall, and KM-13's emitter debt is still open for the three
   kernel projections — extending scope before that wall lands would
   widen the hand-derived drift class, so sequencing matters.
3. "Almost all" is the operator's own qualifier: connection bootstrap,
   Config/Redacted credentials, retry Schedules, and process lifecycle
   are environmental-band carriage and must never be forced into
   algebraic costume.
4. LLM parity in *understanding* is an empirical claim; KM-18's
   pre-registered eval is the instrument, and this note licenses no
   claim ahead of its runs.

## 7. For the DEV-772 grill

- **AE-8 (proposed) — the expressibility ruling.** Every public API
  names its denotation as a meta-language term; fluent surfaces are
  generated sugar; parity is held by served-equals-derived walls;
  APIs with no denotation are fenced as carriage or grilled as new
  constructs. Alternatives: keep the rule at the kernel language only
  (leaves affordances hand-authored — the drift class); adopt without
  the emitter walls (parity becomes prose). Reversal: additive —
  hand-authored surfaces persist until each is re-derived; nothing
  strands.
- **AE-9 (proposed) — the access-pattern table (§2) as the checked
  inventory**: every public read/write path maps to one of the eight
  rows, and a ninth pattern is a grill item by construction.
- Sequencing rider: AE-8's walls extend KM-13's emitter — rule the
  emitter first or with it, never after the scope grows.

## 8. The vertical slice, targeted now (operator direction)

One affordance through the whole pipeline, as a pre-grill exemplar in
the rung-brands pattern — scratch, wired into nothing, gated by
nothing, its output quoted in the grill:

**Candidate: the cell join affordance (`joinAll`).** Chosen because
every ingredient exists and nothing needs inventing: the runtime term
is shipped (the casJoinLoop composition), the donors are proven (the
F1 ACI package and its semilattice instantiation), and both register
texts are already drafted in the algebraic-register record. The slice
demonstrates, for this one affordance:

1. **the denotation** — the join composition as a declared term with
   a digest;
2. **the generated fluent surface** — the TS signature and JSDoc
   (algebraic sentence first, plain reading second, donor and tier
   last) emitted from the term, hand-written nothing;
3. **the other projections** — the MCP tool entry and the prose row
   in both registers, emitted from the same term;
4. **the parity wall** — a byte-compare across all projections'
   shared fields and one digest naming the term they share, the
   served-equals-derived discipline at API scale.

What the slice proves if green: AE-8 is implementable at one-affordance
cost, and the emitter debt (KM-13) pays down one row while the scope
question is still open. What it deliberately does not do: touch the
shipped Cell surface, claim the eval's parity result, or generalize
past one row before the ruling.

# Plait, part 2 — the action plane (design commission, continued)

Status: **commissioned continuation**, ordered by the operator 2026-08-17
after reviewing part 1
([the fabric design](2026-08-17-plait-coordination-fabric.md)) with the
directive: *before further formalization, make action a first-class
consideration* — scheduling and performing agentic actions (tool calling,
MCP-based APIs) through an Effect-constructed context and
dependency-injection API, with context population (prompts, tool
descriptions, static and dynamic context) drawn from the shared semantic
substrate, and with a native account of how higher-tier frontier models
and lower-tier subagent models ride the same substrate. **Entered as
PROPOSED; ruled 2026-08-17** — G8–G12 are recorded in the ratification
record and the second-wave grill sheet carries the rest; this document amends
part 1 (amendment map in §8) and changes no code, ledger row, or spec.
Confidence tiers as in part 1 (ratified / proven / measured / shipped /
proposed / lead).

---

## 1. The reframe

Part 1 built a fabric where agents *could* coordinate: evidence converges,
outcomes are fenced, identity is content-addressed. Part 2 makes the act
itself a fabric citizen. The reframe in one sentence:

> **An agentic action is a fenced, content-addressed unit of work whose
> context is a derived value with committed identity, whose sampling is
> the one quarantined probabilistic arrow, and whose effects re-enter the
> substrate only through the lawful doors that already exist.**

Nothing in that sentence required new machinery to be invented — every
clause names an estate construct already ratified, proven, or specced:
the effector's work-digest idempotency (shipped shape), the certificate
(shipped vocabulary), the semantic fold ("derived surfaces cannot drift
because their input has committed identity" — CONTEXT.md, shipped), the
estate's own agent doctrine ("the LLM proposes among legal moves — the
only probabilistic arrow" — measured, dispatch 21 E1), and refusals,
fills, and fenced commits as the effect doors. The action plane is those
constructs composed, plus four small new laws (§4) that make the
composition provable.

What it deliberately is **not**: a workflow engine. The synthesis measured
and refused Effect's durable-execution surface (ruled, part 1 §3), and
this design additionally observes that the estate does not need the
*shape* either — §5.4 shows that outcome-driven iterate-until-done loops
are already expressible as protocol sessions (rubric = protocol value,
grader = seat, iteration = successor round, done = close). Sessions are
the loop structure; the action plane only supplies the limbs.

---

## 2. Result first — the five moves

**2.1 The effector generalizes to the action register.** An action
declaration is a canonical value — {capability digest, context-program
digest, input anchor set, policy digest, round} — and its digest is the
work digest that keys a register (part 1, C5/F5). Consequence, by the
already-planned lease-safety theorem: **at most one landed effect, no
matter how many attempts** — the safety half only; that some attempt
eventually lands is liveness and carries no claim (amended 2026-08-17,
DevRel overclaim finding on DEV-697: part 1 refuses exactly-once as a
claim, and this sentence previously used its vocabulary). Schedulers may fire duplicates, nodes may
race, retries may storm — at most one outcome per declared action ever
lands, and every landed outcome names the exact context its performer
saw. Re-attempting *with new information* is not a retry but a **new
round**: a fresh declaration pinned to its predecessor's digest — the
estate's successor-round idiom doing deduplication's other half.

**2.2 Context is a derived value.** Context assembly is a **semantic
fold**: a declared, digested program folds digest-anchored inputs
(cataloged frames, journal spans, cell states, the frontier, prior
outcomes) through declared renderers into a canonical **Context Value**
whose bytes — and therefore whose digest — are a function of (program,
input heads) and nothing else (F7). Prompts stop being strings and become
what every other estate derivation already is: re-derivable, diffable,
cacheable by `(program digest, anchors)` without invalidation logic, and
carried on the action's certificate so an auditor can reconstruct
*exactly what the model was shown*. Two agents disagreeing about "what
did you know when you did that" becomes a digest comparison.

**2.3 The probabilistic arrow stays quarantined — and instrumented.**
The fabric never claims model outputs are deterministic. It claims the
*envelope* around the arrow is lawful: the arrow's input has a digest
(F7), its raw output is recorded as an opaque-leaf value with attribution
(monotone plane, welcome even from a superseded holder), and its
*consequences* pass through exactly three doors — emit evidence
(unfenced, ACI), fill/dispute a hole (validated by the daemon's step,
refusals as data), or commit an outcome (fenced by token). A confabulated
tool call, a duplicated action, a zombie worker's late answer: all land
as attributed evidence or refused commits, never as corrupted state. This
is the part-1 candidate law ("meaning cannot be corrupted from the
wire") extended to its most important wire: the one with a model on the
other end.

**2.4 Reactivity is the monotone fragment.** A **trigger** is a declared
(monotone predicate, action template) pair: *when evidence ⊒ X appears /
a hole reaches state S / an outcome lands — schedule action A*. Because
the predicate is monotone, trigger evaluation is coordination-free and
duplicate-safe by the CALM placement (F10): every replica may evaluate,
every firing may duplicate, and the register dedups the claims. The
non-monotone reactions — fire on *absence*, fire at a deadline — are
refused from the trigger algebra and routed where CALM demands: a
declared authority (a timeout seat whose *act* closes a round). The
two-plane split of part 1 thus extends to time: the fabric reacts to
growth freely and to silence only by declared authority.

**2.5 Model tiers are seat profiles, and the writ is the R channel.** A
**policy** is a declared, digested value: capability class (a floor, not
a vendor pin), effort class, token/cost budget, context-program
allowlist, toolkit digest, and writ profile (may emit / fill / dispute /
close-participate / spawn). Policies form a meet-semilattice under
capability intersection, and **delegation attenuates by construction**
(F9): a spawned child's policy is `parent ⊓ requested`, so no action tree
ever amplifies authority. In Effect v4 this becomes type-level: a policy
compiles to a Layer stack, an action handler is
`Effect<Outcome, Refusal, R>`, and R must be inside the policy's service
set — a subagent-tier handler *cannot express* `Registers.commit`
because the service is absent from its environment. Frontier-tier and
subagent-tier are then just two well-known policies (§6), and the
estate's Eng/Rev/operator seat separation types directly onto them.

---

## 3. Grounding — what the estate already settled

| Settled thing | Status | What the action plane does with it |
| --- | --- | --- |
| Effector: one authority value per work digest, CAS, fencing token | shipped; claims re-earned as F5 | becomes the action register unchanged — the *only* new content is what goes in the declaration |
| Certificate {schema, program, input anchor, span head} | shipped vocabulary | gains one field: the context digest; an action outcome is a certified derived record |
| Semantic fold (derived surfaces cannot drift) | shipped | context assembly and tool-description derivation are instances, not inventions |
| Agent = (head, writ); frontier serves legal moves; LLM proposes among them | measured (dispatch 21) | the action plane serves the frontier *inside the context value*, so the legal-move set is part of committed context |
| MCP surface derived from the daemon's self-description, walled served-equals-derived | shipped + measured (synthesis §2.4) | the precedent for deriving every agent-facing surface; the fabric extends the derivation, never hand-writes tool lists |
| MCP untyped-argument defect (opaque → `{}` schema; agents fail) | measured, fix ranked item 1 in the estate queue | a named dependency for any LLM-driven scene; not worked around here |
| Attribution gap | measured, decision pending | unchanged fence from part 1 §7.4: action *mechanics* are in scope now; multi-party *evidentiary* claims wait |
| Wedge defect (single-seat absorb self-differ) | measured, board issue | actions that fill holes inherit the daemon's revision-mode semantics; the wedge disposition is upstream, watched, not duplicated |
| "No hand-authored model verdicts" | ratified | trigger firings, register interleavings, and assembly outputs get generated vector corpora like everything else |
| Sal's verification-distance ladder | adopted in part 1 §9.1 | every §4 law states its L-layer; nothing here claims L0 for L2 behavior |

One external grounding, used with its tier stated: the current LLM
provider guidance (lead — vendor documentation read 2026-08-17)
prices context as a **byte-prefix cache** whose documented failure modes
are all non-determinism — timestamps, unsorted keys, per-request IDs
interpolated early. Canonical bytes kill that entire failure class by
construction, and §5.3 turns it into a measured wall rather than a
claim.

---

## 4. The new mathematics — C6–C9, F7–F10

Four constructs join part 1's five; four laws join F1–F6. Same posture:
small, statable, zero-novelty-for-novelty's-sake.

### C6 — the context assembly fold

Objects. A **selector** is a digest-anchored query against the substrate:
catalog value by digest; journal span by anchor; cell state at head;
frontier of session S for seat R at head; outcome by work digest. A
**renderer** is a declared semantic fold from a substrate value to a
context segment (text, tool description, resource). A **context
program** is a canonical value: an ordered list of (selector, renderer)
pairs, each tagged with a declared **volatility class** —
`static ≺ policy ≺ session ≺ live ≺ turn`. Its digest is the program's
identity. An **assembly** applies a program at a set of input heads,
producing a **Context Value**: canonical bytes, segment-ordered by
volatility class (stable first), each segment carrying the digests of
the substrate values it rendered.

**F7 (assembly determinism, target R5, home `verify/fabric`).**
`assemble(program, inputs)` is a function: equal program digests and
equal input values give byte-equal context values. Consequences, each a
part-1 memo-law instance: the context cache keyed
`(program digest, input digests)` is invalidation-free; context
provenance is a certificate; context diff is value diff.

**F8 (contexts are head-relative truths).** A context assembled at heads
H is never *wrong* later — it is a true record of a DAG position;
staleness is head-relative **absence**, repealed by reassembly at newer
heads, never a corruption. This gives re-prompting a semantics: a new
attempt with fresher context is a new round with a new context digest
pinned to the old — the successor-round idiom again, now for knowledge.

**Not claimed:** anything about the *quality* of a context. Assembly law
covers identity and provenance; whether a program selects *good* context
is authorship, judged by outcomes, iterated by humans and frontier-tier
seats. A theorem about prompt quality would be an overclaim and none is
made.

### C7 — the action register

An **action declaration** is a canonical value:

```
{ capability: <digest>          // a cataloged tool/act declaration
  context:    <program digest>
  anchors:    [<digest>...]     // the input heads assembly will read
  policy:     <digest>
  round:      <predecessor work digest | null> }
```

Work digest = digest(declaration). The register keyed by it is part 1's
C5 verbatim: grant by `create`, renew/steal by CAS with monotone tokens,
**commit carries the token and the outcome digest**, stale commits
refuse. The outcome record is a certified derived record: result value
(or blob ref), context digest actually assembled, capability digest,
performer attribution, span head.

Laws, all riding F5 with small additions (target: R5 for the algebra,
R3→R4 for the register as in part 1):

- **At-most-one landed outcome**: per declaration, under arbitrary
  duplicate scheduling, racing claimants, crash-steal interleavings.
  (F5's safety statement applied to action declarations; eventual
  landing is liveness, unclaimed.)
- **Attempt/round separation**: a *retry* re-claims the same work digest
  (same declaration — idempotent by the register); a *revision* is a new
  declaration with `round` pinned (new work digest — deduplication never
  swallows new information). The distinction is definitional, which is
  the point: the scheduler cannot confuse them even in principle.
- **Well-foundedness**: the action DAG (rounds pinning predecessors,
  parents pinning child outcomes into their anchors) is acyclic — a
  cycle needs a digest preimage, the same argument that already bans
  protocol recursion (shipped; sub-session lane G5).

### C8 — the policy lattice and the typed writ

A **policy** is a canonical value (capability class, effort class,
budgets, context allowlist, toolkit digest, writ profile, spawn bound).
Policies order by capability inclusion; meet `⊓` is componentwise
intersection (writ bits AND, budgets min, allowlists ∩, class floors
min). Spawning is only defined as `child = parent ⊓ requested`.

**F9 (attenuation, target R5, small).** In any action tree, every
descendant's effective policy ≤ the root's — induction on the tree, meet
monotonicity does all the work. Twenty lines of Lean; a real property:
**no delegation chain ever escalates** — a frontier seat can hire a
thousand workers and the thousand cannot jointly exceed what the one was
granted.

The Effect rendering (§6): a policy compiles to a Layer stack; absent
services are absent capabilities at the type level. Honesty box, stated
here and in the ledger row when one exists: **type-level writ is
developer experience, not security.** A malicious node ignores our
types. The security half is the same as everywhere in the fabric —
server-side refusal (CAS, close authority, daemon validation) plus the
pending attribution decision. The types make the *honest* path the easy
path; the registers make the dishonest path the futile one.

### C9 — the trigger algebra

A **trigger** is a declared canonical value: (monotone predicate,
action-declaration template, policy). The predicate grammar is closed
and deliberately small: evidence-appears (bag ⊒ pattern), cell-reaches
(state ⊒ x), hole-in-state (open/filled/disputed/decided/sealed),
outcome-landed (work digest), head-advanced-past (anchor). Every
production is monotone by construction; the grammar has **no negation,
no absence, no deadline**.

**F10 (reaction robustness, target R5).** Trigger evaluation commutes
with evidence merge: for monotone p, once p holds at state s it holds at
every s' ⊒ s (stability), and evaluating over any duplicate-and-permute
delivery of the substrate growth fires a set of *hints* whose landed
*claims* are deduplicated by the register (C7). Net, both halves
safety: **an enabled firing never un-fires** (stability — the
predicate holds at every later state) **and never lands twice** (the
register); no coordination anywhere in the reactive path. That every
enabled firing is *eventually evaluated* is liveness and carries no
claim (amended 2026-08-17 — the previous "no missed firings" wording
conflated the two).

Non-monotone reactivity is not expressible, on purpose. "Fire if no
evidence by Friday" is a decision that a candidate set is complete —
CALM's non-monotone act — so it belongs to a declared authority: a
**deadline seat** holding close (or dispute) authority, whose *act* is
journaled, attributed, and fenced like any other. The API offers this as
a first-class pattern (§6.4), so the restriction reads as a door, not a
wall.

---

## 5. Context population — the substrate as the prompt

### 5.1 The layers

| Layer | Substrate home | Volatility class | Examples |
| --- | --- | --- | --- |
| **Frames** | catalog (content-addressed values) | `static` | system frames, personas, house rules, capability corpora — authored once, digested, shared fabric-wide |
| **Policy view** | policy value | `policy` | the acting seat's writ, budgets, toolkit — rendered so the model is told exactly what it may do |
| **Session frame** | protocol value + bindings | `session` | the protocol, the seats, the fences, the predecessor chain |
| **Live view** | folds over journals/cells | `live` | the frontier (state-anchored, seat-relative — the ruled shape), span summaries, cell states, sibling-outcome digests |
| **Turn** | the triggering fact | `turn` | the hole being filled, the shard claimed, the question asked |

Tool descriptions are layer-1/2 material **derived, never hand-written**:
a toolkit is a semantic fold over cataloged capability declarations —
each rendered description carries its source digest (the MCP `_meta`
bridge precedent, shipped) and states its trigger condition ("call this
when…"), which is both the estate's teach-don't-guess discipline and the
documented best practice for current frontier models (lead). The
served-equals-derived wall from the daemon's MCP layer generalizes: any
agent-facing surface the fabric serves is walled against its derivation.

### 5.2 Assembly in practice

A context program for a worker-tier extraction action, sketched as data
(this *is* the artifact — programs are cataloged values, not code):

```
program corpus-distill/worker@<digest>:
  static   frame     catalog:flb.frame.distill-worker@<digest>
  policy   writ      policy:<self>                       // rendered writ + budgets
  session  protocol  session:<self>.protocol             // what game we are in
  live     frontier  frontier(session, seat=<self>)      // my legal moves, anchored
  live     siblings  outcomes(lane, part=<self>.part)    // digests only, not bodies
  turn     shard     blob:<shard digest>                 // the work itself
```

Every line is a digest-anchored selector; the assembled value's identity
commits all of them. Note what is *absent*: no timestamps, no session
UUIDs in prose, no "current date" — time-shaped facts enter, if a
protocol wants them, as journaled evidence with digests like everything
else.

### 5.3 Provider caching, aligned by construction

Provider-side prompt caching (every major vendor; lead) is byte-prefix
matching, and its documented failure modes are exactly non-determinism
in the prefix. The fabric's contexts are deterministic bytes ordered
stable-first by declared volatility class. Consequences, priced
honestly as **measured-tier DX**, never ledger claims:

- Identical `static ≺ policy ≺ session` prefixes across all actions of a
  seat profile ⇒ maximal shared-prefix reuse across a fleet, by
  construction rather than by audit.
- Cache invalidation *tracks meaning*: the prefix bytes change iff some
  input digest changed. No silent invalidators exist to hunt.
- The provider adapter (§6.5) may place provider-specific cache
  breakpoints at volatility-class boundaries; that mapping is adapter
  code at the edge, walled by a cache-hit-rate measurement in the demo
  scoreboard, and never part of the node contract.

### 5.4 The acceptance loop is already a session

The pattern the field calls outcome-driven agents — state what done looks
like, grade each iteration against a rubric, revise until satisfied
(lead: current managed-agent products ship exactly this) — needs no new
machinery here:

- the **rubric** is a protocol value (content-addressed, seats declared:
  performer, grader, closer);
- each **iteration** is a round — a session pinned to its predecessor;
- the **grader** is a seat filling a verdict hole (a lower- or
  higher-tier model, a human, a test harness — the fabric cannot tell
  and does not care);
- **done** is close under the declared authority, sealing the verdict by
  the declared fence.

Every step is journaled, attributed, re-derivable; the loop's whole
history is a DAG walk. This is the strongest instance of the commission's
"don't fall into existing patterns" charge: where other stacks bolt a
workflow engine onto a chat API, the estate's session machinery *is* the
loop, with laws already proven about the parts that matter.

---

## 6. The Effect v4 API — actions, DI, tiers

New services beside part 1's surface (same package, `@foldlab/plait`):

```
Capabilities   declare/catalog action capabilities (schema in, schema out, effect door)
Contexts       declare programs; assemble; memoized by (program, anchors)
Actions        declare/schedule/claim/perform/commit; the register client
Triggers       declare monotone reactions; the hint pump
Models         the provider seam: LanguageModel provisioning by capability class
Toolkits       derive model-facing toolkits from cataloged capabilities
Guidance       the frontier, served as context material
```

### 6.1 Policies compile to Layers — the writ is the R channel

```ts
import { Context, Effect, Layer } from "effect"
import { Policy, Actions, Contexts, Lanes, Registers, Models } from "@foldlab/plait"

// Two well-known profiles. Policies are canonical values with digests;
// Policy.layer compiles one to the Layer stack it licenses.
const WorkerSeat = Policy.declare({
  name: "distill-worker",
  modelClass: "compact",          // capability floor, provider-free
  effortClass: "low",
  writ: { emit: true },           // and nothing else
  context: [DistillWorkerProgram],
  budgets: { tokensPerAction: 20_000, costPerAction: usd(0.05) },
})

const FrontierSeat = Policy.declare({
  name: "distill-lead",
  modelClass: "frontier",
  effortClass: "high",
  writ: { emit: true, fill: true, dispute: true, closeParticipate: true,
          spawn: { max: 32, atMost: WorkerSeat } },   // attenuation: ⊓ enforced
  context: [LeadProgram, ReviewProgram],
  budgets: { tokensPerAction: 400_000, costPerRound: usd(8) },
})
```

An action handler's environment is its writ. A worker handler that tries
to commit an outcome does not fail at runtime — it fails to compile,
because `Registers` is not in the Layer stack `Policy.layer(WorkerSeat)`
provides:

```ts
// R = Contexts | Models | Lanes — exactly the worker writ. Adding a
// Registers.commit here is a type error under WorkerSeat's layer.
const extract = Actions.handler(ExtractTerms, (input) =>
  Effect.gen(function* () {
    const ctx = yield* Contexts.assemble(DistillWorkerProgram, input.anchors)
    const out = yield* Models.generate({ context: ctx, output: TermsSchema })
    yield* Lanes.emit(DistillLane, { body: out, cert: ctx.certificate })
    return out.digest
  })
)
```

The frontier tier holds the doors the worker lacks:

```ts
const lead = Actions.handler(DistillRound, (round) =>
  Effect.gen(function* () {
    const shards = yield* Guidance.openWork(round.session)
    // spawn: child policy is parent ⊓ WorkerSeat — F9 makes over-grant unrepresentable
    yield* Effect.forEach(shards, (s) =>
      Actions.schedule(ExtractTerms, { anchors: [s], policy: WorkerSeat }),
      { concurrency: 8 })
    const merged = yield* Folds.await(TermCounts, round.head)
    yield* Registers.hold({ work: round.digest }, (token) =>
      Registers.commit({ work: round.digest, token, outcome: merged.digest }))
  })
)
```

### 6.2 The model seam

`Models` wraps the pinned Effect `unstable/ai` `LanguageModel` /
`Toolkit` abstractions (vendored; shapes re-confirmed against
`node_modules` at build per house rule) behind a fabric-shaped door, so
provider modules never leak into the node contract:

- provisioning is a `LayerMap` keyed by **capability class**
  (`compact | standard | frontier`), each class bound to a concrete
  provider Layer at deployment configuration — tiering is configuration,
  never code;
- `Models.generate` takes a Context Value and an output schema; it
  renders segments to the provider's prompt shape, applies the §5.3
  cache-boundary mapping, decodes the result against the schema
  (constrained decode; excess refuses), and journals the exchange as a
  span with the context digest on the certificate;
- token streams are transport: surfaced live to UIs via a lane of
  ephemeral progress frames, never identity-bearing, never journaled
  beyond the final record (part 1's rule: nothing fingerprints a
  transport form);
- tool use loops (the model calling fabric capabilities mid-generation)
  execute each call as a *nested action* under the same policy — the
  writ follows the model into its tool calls by construction.

### 6.3 Triggers

```ts
// Monotone by construction: this compiles because evidenceReaches is in
// the trigger grammar. A hypothetical Triggers.onAbsence does not exist.
yield* Triggers.declare({
  when: Triggers.evidenceReaches(DistillLane, { docsSeen: atLeast(1) }),
  schedule: { capability: ExtractTerms, policy: WorkerSeat,
              anchors: Triggers.matchedAnchors },
})

// The non-monotone half, as a declared authority instead:
yield* Seats.deadline({
  session, seat: "timekeeper",
  at: deadlineFact,            // itself journaled evidence
  act: Seats.close,            // an attributed, fenced act — not a trigger
})
```

### 6.4 What the API refuses (action-plane additions to part 1 §8.5)

Hand-written tool description strings (derive or refuse); prompt
concatenation outside assembly (`Models.generate` takes Context Values,
not strings); provider names in policies; triggers on absence; spawn
without a policy meet; outcome commits outside `Registers`; reading a
model's raw stream as a value (the journaled record is the value).

---

## 7. Tiers, concretely

| | Frontier seat | Subagent seat |
| --- | --- | --- |
| model class | `frontier` (capability floor) | `compact` |
| effort class | high — long-horizon, self-verifying | low — scoped, terse |
| writ | fill/dispute/close-participate/spawn(⊓) | emit only |
| context programs | wide: session frame + full frontier + sibling outcomes + review corpus | narrow: frame + one shard + own frontier slice |
| budgets | per-round, large | per-action, small |
| failure posture | its *acts* are fenced and journaled; its *judgment* is reviewed by Rev-profile seats | its output is evidence; a bad worker costs one shard's redo, never a corrupted merge |

The estate's seat separation (Eng builds / Rev reviews / operator
ratifies — AGENTS.md law) types onto policies directly: Eng-profile =
perform-heavy writ, Rev-profile = dispute rights + read-wide context +
no close, operator = close authority, held by a human seat. That the
same policy lattice covers a Haiku-class worker, an Opus-class lead, a
test harness, and a human reviewer is the agent-agnosticism thesis
restated at the action layer: **a tier is a policy, a policy is a value,
and the fabric coordinates values.**

Budgets are liveness machinery and say so: token/cost budgets pace and
interrupt (Effect interruption = budget exhausted = lease lapses =
another claimant steals); they never appear in identity, never gate
meaning, and the ledger will carry no claims about them beyond the
scoreboard's measured numbers.

---

## 8. Amendments to part 1

1. **§5 (constructs):** C6–C9 join C1–C5; F7–F10 join F1–F6 with homes
   as stated (F7/F9/F10 in `verify/fabric`, zero-dep; C7's laws ride the
   Veil-pinned F5 package). **F8 is ruled a corollary, not a theorem**
   (2026-08-17, proof-program audit B-9): its safety content is F7
   applied at pinned inputs plus F3's resumption plus the absence-sort
   refusal semantics; no gate refusal cites F8 by name, and its
   "repealed by reassembly" clause is never stated in an *eventually*
   reading — that would be liveness. No seat authors an F8 theorem.
2. **§10 (slices):** two insertions. **Slice 2a — contexts**: `Contexts`
   + assembly + memo wall; gates: byte-identical reassembly across TS/Go
   for a generated program corpus; a planted timestamp selector refused
   at declaration. **Slice 4a — actions and triggers**: register-backed
   actions, policy layers, trigger pump; gates: model-exported
   interleaving corpus replayed with verdict equality (duplicate hints,
   racing claims, stale commits); an attenuation audit walking a
   generated action tree proving every node's policy ≤ root (the F9
   vector wall); negative control: a handler compiled against a widened
   layer is refused by the policy check at declaration time.
3. **§11 (demo):** the optional LLM scene is promoted to the
   **centerpiece of part 2's acceptance**, with gates that check the
   *coordination record*, not the prose: every action outcome's context
   digest re-derives from its certificate; at most one landed outcome
   per declaration under the chaos schedule; the trigger scoreboard
   shows every enabled reaction claimed once — none unclaimed, none
   claimed twice — at quiesce and
   zero double-landed reactions against the generated growth trace (a
   measured fact about this run, not a liveness claim; "exactly-once"
   stays refused vocabulary); the attenuation
   audit passes over the live action tree.
   Model output quality is explicitly ungated (nondeterminism is
   quarantined, not denied). The scene still waits on the two named
   dependencies: the MCP typing fix and — for any multi-party
   evidentiary claim — the attribution decision.
4. **§13 (grill sheet):** G8–G12 added below.

---

## 9. Risks and honest bounds (additions)

1. **No theorem touches prompt quality.** F7/F8 govern identity and
   provenance of context, never its usefulness. Bad programs assemble
   bad contexts deterministically. Authorship remains judgment; the
   fabric makes judgment auditable and iterable (programs are versioned
   values with diffable outputs), which is all it can honestly do.
2. **Type-level writ ≠ security** (stated in C8 and repeated wherever a
   ledger row lands). Server-side refusal + attribution carry security;
   types carry ergonomics.
3. **The trigger grammar will feel restrictive** — that is its function,
   and §6.3's deadline-seat pattern is the pressure valve. If practice
   demands a non-monotone trigger, the demand is a grill item, because
   it is a CALM-boundary move, not a feature request.
4. **`effect/unstable/ai` is an unstable namespace** in the pin. The
   fabric wraps it behind `Models`/`Toolkits` so churn at a pin bump is
   absorbed in one adapter file; if the namespace shifts unacceptably,
   the fallback is a hand-rolled provider adapter behind the same seam —
   priced as one file, not a redesign.
5. **Provider cache mapping is per-provider edge code** and can rot;
   it is walled by the demo scoreboard's cache-hit measurement, and its
   failure mode is cost, never correctness.
6. **Register traffic per action is nonzero** (a grant, renews, a
   commit). For very small actions the overhead dominates; the honest
   answer is batching at the declaration level (one action per shard,
   not per token) and the scoreboard measures it. No claim that every
   granularity is economic.

---

## 10. Grill sheet additions

- **G8 — adopt the action plane as part 2 of the commission.**
  Recommended: yes — C6–C9/F7–F10 into the proof plan, slices 2a/4a into
  the ladder, demo gates as §8.3. Alternative: fabric-only v0 (part 1
  stands alone; actions deferred — loses the commission's stated
  center).
- **G9 — the trigger algebra is monotone-only.** Recommended: yes, with
  the deadline-seat pattern as the sanctioned non-monotone door.
  Alternative: admit timer triggers as primitives (buys convenience,
  silently reintroduces coordination into the reactive path — refused by
  the design's own thesis, listed for completeness).
- **G10 — policies as canonical values with meet-attenuation (F9), writ
  compiled to Effect Layers.** Recommended: yes. Alternative: runtime
  ACLs only (loses type-level DX; keeps identical security posture).
- **G11 — the model seam wraps `effect/unstable/ai` behind
  `Models`/`Toolkits`.** Recommended: yes (pinned, vendored, adapter
  absorbs churn). Alternative: hand-rolled provider clients (more code,
  no unstable-namespace exposure).
- **G12 — context programs, frames, and toolkits are cataloged values.**
  Recommended: yes — they get digests, walls, and the catalog's
  refusal-on-absence like every other value. Alternative: file-based
  prompts (loses provenance, diffing, the memo law, and the
  served-equals-derived wall — refused by the design; listed because it
  is what every other framework does).

---

## 11. Sources

Part 1 and its source roster, inherited. Estate documents newly load-
bearing here: `scratch/dispatch/21-the-use-catalog.md` (E1/E2 agent
doctrine, via the corpus sweep); `CONTEXT.md` §Effector, §Certificate,
§Semantic fold (in place); the synthesis §2.4 (MCP served-equals-derived
walls, untyped-argument defect), §4 items 1–2 (dependency ordering);
`docs/design/2026-08-17-mpst-refusal.md` (the projection IOU, inherited
by `Guidance`). Vendored: `repos/effect/packages/effect/src/unstable/ai/`
(module roster read in place 2026-08-17: `LanguageModel`, `Prompt`,
`Tool`, `Toolkit`, `Chat`, `McpServer`, `Model`, `EmbeddingModel`,
`Tokenizer`, `Telemetry`); `LLMS.md` AI-module usage notes. External
(lead, 2026-08-17): current provider documentation on prompt-cache
prefix semantics and multi-tier agent rosters — used for DX alignment
only; no ledger claim rests on it.

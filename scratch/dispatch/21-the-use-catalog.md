# The use catalog: agent-first work over the estate

2026-08-16, coordinator draft. **A survey and an exploration map —
prose only, no machinery, every build-shaped item PROPOSED pending its
own grill.** Companions: the agent-surface dossier
(`docs/design/2026-08-14-agent-surface-production-shape.md`), the
concierge-sessions design
(`docs/design/2026-08-14-concierge-sessions-and-catalog.md`), the
adoption boundary (`docs/design/2026-08-14-adoption-boundary.md`), and
the ontology demo issue (`scratch/dispatch/04-ontology-demo.md`).

This note does three things: codifies four **exploration areas**
(E1–E4) that development should keep in frame as the substrate
hardens; catalogs the **generalization patterns** — the creative uses
a hole-filling session admits once you stop reading it as conflict
resolution; and states the **grill questions for the sub-session
hole**, the one structural addition that turns the shipped negotiation
machine into a substrate for arbitrary task trees.

Glossary discipline: this note is written to be legible to someone who
has read only `CONTEXT.md`. Where a house term appears, it is glossed
at first use.

## Result first

The estate is already a multi-agent system; it calls the agents
*seats*. The runnable slice (`proto/ts/examples/task49-session.ts`) is
a three-agent transcript — operator, coordinator, builder — filling
typed holes under declared authority, staging a genuine cross-seat
dispute, and closing under a declared close seat. Nothing about
"multi-agent" needs inventing.

What generalizing to arbitrary work actually needs, in order:

1. **One type form** — a hole discharged by a completed sub-session —
   which gives recursion: a task is a session, a subtask is a child
   session pinned into a parent hole, the session tree is the plan,
   and the union of open frontiers is the work queue. Grill questions
   in §6.
2. **Two DX objects** — the briefing corpus and the repair policy
   (§4) — which turn "prompt the agent well" into cataloged,
   digest-addressed values.
3. **The exploration areas E1–E4** held in frame as the substrate
   work proceeds, so that each hardening step is also a step toward
   the use surface rather than orthogonal to it.

The intended production posture is **agent-first through MCP**: the
daemon's tool surface is derived from `contract.describe` (so the
tool list cannot drift from the wire), a human collaborates by
holding seats, and every user interface is a projection of the
frontier — which holes are open, which decisions await my seat —
never a separate state store.

---

## E1 — Coordination is data; conversation is residue

The exploration area: what multi-agent work looks like when agents do
not talk to each other.

The shape, restated from the ratified loop: an agent is `(head,
writ)` — what it has seen plus what it may speak. Its whole loop is
fold the journal into state, ask the frontier for moves legal for its
seats, let the LLM propose among them (the only probabilistic step,
quarantined to that single arrow), submit under a head precondition.
There is no message topology to design and no orchestrator to write.
Coordination lives in the protocol value: holes (what must be said),
seats (who may say it), fences (how disagreement resolves), close
authority (who may end it). Chat between agents, if journaled at all,
is evidence the fold forgives — residue, not mechanism.

What this area explores as development progresses:

- **The session tree.** With sub-session holes (§6), decomposition is
  authoring: an agent that breaks a task down is running an authoring
  dialogue that mints the child protocol, journaled and replayable.
  Planning stops being a scheduler concern; schedule irrelevance
  (proved in `verify/moves`) is precisely the license to let reality
  order the fills.
- **The work queue as a fold.** "What is open, for whom, across the
  tree" is a query over journals, not a service. Assignment is seat
  binding; load is fence contention; progress is completion-set
  coverage. None of these needs new instrumentation because
  observability is a fold over the same journal the system runs on.
- **Human-in-the-loop as a seat, not a channel.** The user holds
  fence seats (decisions) and fill seats. Approval workflows,
  escalation, and sign-off are protocol declarations, not application
  code.

## E2 — The code and runtime experience

The exploration area: what it feels like to write and run an agent on
this substrate, and which properties to preserve as DX hardens.

Three properties are the substance, each licensed by shipped
machinery:

- **Crash is free.** An agent's knowledge is a fold; rehydration is a
  cache read keyed `(fold digest, head)`. No in-memory agent state to
  checkpoint or reconcile. Restart = re-attach a writ to a head.
- **The runtime teaches.** Every refusal is data — kind, sort, the
  law sentence, the path, got/expected, and `next` hints the daemon
  will accept. The development loop is submit → refused → repair from
  the refusal. The ontology demo's acceptance already encodes the
  posture: an authoring run with zero refusals is suspicious.
- **Pre-flight is total.** `willAdmit(state, move)`
  (`packages/moves/src/kernel.ts`) is a complete prediction pinned to
  the runner by theorem, not a heuristic. An agent can ask "will this
  land?" and trust the answer. This is the
  universal-properties-to-DX rule working as ratified, and every
  future law should be audited for the convenience function it
  licenses.

Standing question for this area: which parts of the loop belong in a
veneer SDK (`Protocol.define`, `Agent.attach`, `session.frontier`,
`session.submit`, stability-safe `watch`) versus staying bare wire —
with the standing rule that the veneer adds sugar strictly above the
writ and can do nothing a bare three-verb client cannot.

## E3 — The production DX ledger

The exploration area: features the design already licenses, ranked by
leverage, beside the honest gaps.

Licensed and wanted:

1. **Stable-watch combinators** — subscriptions restricted by
   construction to predicates the stability theorems make monotone;
   hooks that cannot observe transients. No competing framework
   offers this; it is the consumer-facing face of `decided_stable`.
2. **Frontier refs from the catalog shape query** — the type you just
   made offered at the next hole that fits it, retiring the
   lexicographically-first-sixteen placeholder.
3. **Branch and rebase of sessions** — redo one decision, replay the
   path-disjoint suffix mechanically; diff output is a move script,
   so "show the difference" and "make this into that" are one
   machine.
4. **Dispute and fence-load dashboards as folds** — contention is
   data; "where do agents disagree" is a query, not instrumentation.
5. **The gauntlet as instrument and as tool** — deterministic
   schedule exploration in CI, and exposed to agents so a protocol
   author can adversarially probe convergence before publishing. The
   quiet product thesis.
6. **MCP completions served by the same query fold as the frontier**
   — argument completion and hole-filling advice are one machine
   serving two callers.

Honest gaps, named so the ledger stays honest: seat bindings are bare
strings (no principal authentication — seat authority is an honor
system at the wire); the external-binding engine (work-digest
idempotency, durable execution) is designed, grilled, unbuilt;
backpressure on contended fences, retention, and unbounded dispute
sets are named residuals; `verify/ir` has theorems but no executable
referee; and the moves↔protod refinement gap is held, not closed —
the vector wall is a floor, not a correspondence proof.

## E4 — Ontology adaptation, bootstrapped as sessions

The exploration area: how off-the-shelf domain knowledge gets onto
the estate, using the estate's own machinery rather than an importer
bolted on the side.

- **Ingestion is itself a session.** Adapting an external vocabulary
  (OpenAPI, JSON Schema, schema.org fragment, a DB schema) is an
  authoring dialogue: a translator seeds partials, an agent or human
  seat resolves what the source underdetermines, and every judgment
  call is a journaled move with provenance. The adaptation delta —
  your local narrowing of a public vocabulary — is a **branch**:
  import, branch, add brands and checks, commit. Upstream ships a new
  version: replay your suffix onto the new base; path-disjoint
  customizations rebase mechanically; conflicts refuse at the first
  illegal move with the law named. Ontology adaptation becomes
  version control over meaning.
- **Distribution is journal mirroring.** Evidence federates freely —
  equal bytes, equal digests, anywhere — so an "ontology pack" is a
  catalog journal you copy and verify on read. No package manager, no
  registry service, no trust in the mirror. A starter ecosystem is
  catalogs plus protocol packs; adopting one costs a mirror plus a
  branch.
- **Brand or be unfindable.** Identity commits shape only; field
  names are annotations identity throws away. The single naming
  channel that survives into search is the brand. Therefore the
  bootstrap dialogue must front-load branding: the concierge should
  treat an unbranded import as an open frontier and actively elicit
  names. The adaptation UX is, mostly, a branding conversation.

---

## §4 — Bootstrap DX: the briefing corpus and the repair policy

The operator's grounding cases: over a large multi-level session, one
wants to hand the LLM a dump of domain documents — *"use these to
fill holes"* — or hand it a discipline — *"use these methods when
refused."* Both are real, both are wanted, and the estate-native move
is the same for each: **make it a value, not a prompt.**

**The briefing corpus.** A dump of domain documents is ingested once,
through the certifier, into a journal of EXTERNAL-labeled evidence
facts — source-labeled, digest-addressed, never consulted live as an
oracle. A session opened "over" a corpus carries the corpus reference
in its open event. The DX consequence is the load-bearing one: a fill
proposed from the corpus carries provenance to the evidence span it
was read from, so "why does this hole say X" is answerable by query
forever, and two agents briefed on different corpora produce
distinguishable — auditable — fills. The corpus is also the natural
unit of sharing: brief a fleet by handing every member the same
digest.

**The repair policy.** Because a refusal is typed data — kind, sort,
law, path, `next` — a strategy for responding to refusals is a
declarable mapping from refusal shape to repair method: retry
absence-sorted refusals after the named prerequisite, follow `next`
hints for structural ones, escalate named laws to a human seat, stop
after N rounds on one path. Declared, it has a digest; shared by
digest, it is a team's operating discipline as an artifact rather
than as folk knowledge in a prompt. It also becomes measurable: the
gauntlet can probe a (protocol, policy) pair for convergence, and
"which policy repairs fastest" is a fold over session journals.

Both objects owe grills before any machinery: notably where the
corpus reference lives (open event? per-fill provenance only?),
whether a repair policy is advisory (client-side) or admissible
(catalogable, referenced by sessions), and what of either enters
identity. The instinct to hold: **prompts decay silently; values are
branchable, diffable, and provenance-carrying.** Bootstrapping should
consume values.

## §5 — The tower: one instrument at four levels

The reframe this note forefronts: a session is not a conflict
resolver that happens to collect data; it is a **typed elicitation
instrument** operating identically at four levels of abstraction,
each level's product being the next level's constraint.

- **Level 0 — ontology of ontology.** The grammar `flb.type.v0`
  itself, with TyX as its proved reference statement. Fixed by
  theorems and versioned digest domains; the LLM proposes nothing
  here; change mints a new version, never mutates.
- **Level 1 — ontology.** Cataloged types and protocol values,
  produced by authoring sessions whose frontier derives from the
  level-0 grammar. Commit convergence is the hinge: construction
  terminates exactly when the meaning fold reaches a value the
  identity fold can name.
- **Level 2 — discourse.** Protocol sessions: seats filling holes
  typed by level 1; disputes as data; fences as declared functions of
  the candidate set, never of arrival order; close authority
  declared; successor rounds for revision.
- **Level 3 — leaves.** Fill values conformance-checked against
  cataloged structure at fill time and again on replay; constrained
  decode as the only way in from bytes; canonical bytes as identity;
  literals compared by canonical bytes, never by `==`.

The same three objects recur at every level — a journal (what was
said), a fold (what it means), a frontier (what may legally be said
next, by whom, of what type) — and the recurrence is what makes
information extraction the same machine as negotiation. Constraint
propagates down the tower: grammar shapes types, types shape fills,
checks shape bytes. Evidence propagates up: bytes certify values,
values discharge holes, closed sessions discharge holes in parent
sessions. The session is where the two flows meet under declared
authority. The LLM's role shrinks with descent — structure at level
1, values at levels 2–3, nothing at level 0 — but the quarantine is
uniform: it only ever chooses among moves the frontier proved legal.

Two caps of principle, carried honestly: the semantic gap stands
(recomputability of what was built, never fidelity to intent — a
perfectly journaled extraction can still be a wrong reading of its
document), and search over meaning reaches only as far as brands an
author committed at authoring time.

## §6 — The pattern catalog

Each pattern names what the holes are, what a fill is, what the fence
adjudicates, and what closure yields. Everything here runs on the
shipped session machinery plus, where marked, the sub-session hole
(§7) or the external-binding engine (E3 gap list). The catalog is
open; its purpose is to make the generalization potential concrete
enough to design against.

**P1 — Extraction.** Holes typed by a domain ontology; evidence is a
briefing corpus. A fill is an extraction carrying provenance to its
source span; two extractors disagreeing on a field is a disputed
hole; the fence is adjudication; the completion set says when
extraction is *done* rather than merely stopped. Closure yields a
cataloged record with per-field provenance. Runs today, minus the
corpus-reference convention of §4.

**P2 — Process design.** The ontology describes a process — stages,
entry criteria, roles, escalation. Holes are the design decisions;
seats are the stakeholders; fills are procedure fragments; the fence
settles contested stage boundaries. Closure yields a process
definition that is itself a protocol value — the designed process can
then be *run* as sessions of what was designed. The two-level move
(design at level 1, execute at level 2) is the pattern's point.

**P3 — The research protocol.** The estate already runs this pattern
by hand: draft 19 is nine research-question holes, reports as fills,
an acceptance discipline as the check predicate, and the coordinator
as close seat. Mechanized: holes typed "dated report conforming to
the dispatch discipline," fills carrying the report digest, refusals
enforcing the discipline (a claim without a source refuses at its
path). Closure yields a literature program whose coverage is a
completion set, not a vibe.

**P4 — Action holes.** A hole whose type is "a certificate of having
performed external work" — the work-digest idempotency key, the
attempt index, the response entering as EXTERNAL evidence. The
frontier then *is* the set of legal actions, and "what may this agent
do next" has a typed answer. Requires the external-binding engine.
This is where holes correspond to functions and methods of action:
a pipeline program is already data with a digest, so "run program P
over input anchor A" is a hole type, and its fill is checkable
derivation, not testimony.

**P5 — LLM-task holes.** A hole whose fill must be produced by a
declared method — model, prompt digest, parameters — with the method
digest riding in provenance. Evaluation and judging become protocol
sessions: candidate fills from N methods, a fence rule that is a
declared function of the candidate set, dispute where judges
disagree. What today is an eval harness becomes journals with
replayable adjudication.

**P6 — Intake and collaboration with humans.** The user is a seat;
the UI is a projection of the frontier — open holes, pending
decisions for my seat, stable states reached. Forms, approvals,
escalations, and sign-offs are protocol declarations. The concierge
dance ("no, the ID is a UUIDv4") was this pattern's first live
instance: a human overruling a fill is a seat exercising authority,
not an interrupt.

The through-line worth stating once: in every pattern the LLM's
creativity is spent *inside* holes the frontier proved legal, and
every output the pattern produces is a value with identity — so
patterns compose. An extraction (P1) can brief a process design (P2)
whose stages are action holes (P4) evaluated by LLM-task sessions
(P5) with a human close seat (P6).

## §7 — The sub-session hole: grill questions

The proposal, stated once: a hole whose declared type is "a completed
session of protocol P," discharged by a fill that references the
child session's terminal state. The machinery is nearly present —
sessions carry `predecessor`, terminal state digests are versioned
and checkable, fills are conformance-checked against cataloged types.
The addition is one type form and its check. Before any build, the
grill:

**G1 — What is the fill value?** The final state digest alone, or a
certificate `(session key, head, final state digest, outcome)`? What
must the daemon be able to recompute at fill time, and what only at
audit time? A digest the checker cannot resolve locally is an
asserted identity — forbidden by W1 — so what does the check consult?

**G2 — What does conformance require?** That the child's protocol
digest equals the hole's declared protocol, certainly. Must the
outcome be `completed`, or is "closed but incomplete" a legal fill
some protocols want (a failed subtask is still information)? Is that
distinction a check the hole declares, or two different hole types?

**G3 — Which refusals are absence?** Filling with a session this
daemon cannot resolve yet: absence (retry-relevant) or structural?
May the child live in a different venue — and if so, what does
verification cost, given heads are claims and the parent's daemon
cannot refold a journal it does not hold? Does the sub-session hole
quietly import a cross-venue trust question the estate has so far
refused?

**G4 — What is stability, compositionally?** A closed child is
terminal for meaning. Does `decided_stable` extend through the
parent's hole — is "parent hole filled with closed child" a stable
predicate the watch combinators may expose? And does the parent
frontier surface the child's open frontier (a tree frontier), or is
that a separate advisory surface — since the frontier must remain a
function of state, never of history?

**G5 — Is recursion well-founded?** May a child's protocol contain a
sub-session hole naming the parent's protocol? If mutual reference is
legal, what prevents an infinite obligation tree — a depth bound, a
well-foundedness check in the certify walk, or nothing (and openness
is accepted)? The closure law kept grammar inclusion decidable; what
is the analogous discipline here?

**G6 — Does authority delegate?** Who may open the child, and do the
parent's seat bindings constrain the child's? If delegation is
wanted ("the builder seat may open build sub-sessions and bind its
own workers"), is it a declared protocol fact, and what does the
close authority of the child owe the close authority of the parent?

**G7 — What does revision do to the pin?** Parent branches at a step
before the fill: the child pin rides the suffix — replayable iff
path-disjoint, per the standing rebase rule — but does a successor
round of the *child* stale the parent's fill? Is the fill a pin to a
head (immutable, honest, possibly stale) or to a session identity
(live, but then the fill's meaning moves after commit — which the
digest discipline forbids)? The instinct: pin to head; successor
rounds are new fills.

**G8 — What must the gauntlet probe?** Parent completion now waits on
child completion. What is the convergence claim for a session tree
under all schedules, and does the existing one-state-digest invariant
lift to trees, or does the tree need its own invariant before P2/P4
patterns lean on it?

**G9 — Does it stay one kernel?** The fill check gains a new case.
Does it live in the one fill kernel with semantic branching confined
to the step seam, per the standing one-kernel discipline — and if it
needs the catalog and journal store to resolve the child, what does
that do to the purity of the seam?

---

## What this note does not do

It builds nothing, amends no law, and changes no seam status. E1–E4
are exploration areas, not lanes; the pattern catalog is a survey,
not a commitment; §4's two objects and §7's hole are PROPOSED and owe
their grills. The only ask on the substrate lane is negative: as
hardening proceeds, prefer the option that keeps these uses cheap —
values over prompts, folds over services, declared authority over
literals — which is, so far, the option the estate has taken anyway.

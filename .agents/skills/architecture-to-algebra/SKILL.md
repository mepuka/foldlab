---
name: architecture-to-algebra
description: Interview-driven mapping of any software, product, or system architecture onto the estate's algebra — truth plane (join-semilattice facts), directory plane (names), fence inventory (decide), fold table with rung and carrier assignments, and the liveness plane (coalgebras: consumers, views, sessions). Use whenever the user wants to design or re-derive a service, feature, harness capability, or data flow in algebraic terms, including phrases like "map this to the algebra", "what's the truth plane / fold / lattice here", "algebraize this", "which carrier or rung does this need", "ground me", or any architecture discussion that should end in generators, sentences, laws, and refusals instead of ad-hoc services. Also use when the user describes classic harness needs (logging, memory, search, scheduling, code execution, compaction, replication) and wants them derived from the kernel rather than built beside it.
---

# Architecture to algebra

Turn a described system into a lawful mapping onto the kernel algebra
by interviewing the user, challenging their answers, and producing a
standard mapping document. You are a grill partner, not a scribe: the
value of this skill is in the questions that force the right
abstraction, not in transcribing the user's first framing.

The stance that governs everything here: **the engine is two
stateless functions** — `admit` (the door) and `eval` (anchored
reads) — and everything else is carriage. A "service" is a bundle of
declared folds + a root + a writ; its performance envelope is legible
from the rungs of its folds before it exists. Your job is to find
that bundle inside whatever the user describes.

## Reference files — read as the interview needs them

| File | Read when |
| --- | --- |
| `references/generators.md` | Writing sentences (probe 7), challenging a verb that isn't one of the eight, or citing a closure row / refusal |
| `references/planes-and-ladder.md` | Assigning rungs and carriers (probe 4), pricing anything, or the user asks about storage/channels/performance |
| `references/duplex-liveness.md` | Outflows and liveness (probes 5–6), sessions, subscriptions, "the system must be running" |
| `references/worked-examples.md` | The user's system resembles a known harness component, or you want calibration for output quality |

Read `generators.md` before the first challenge round — the
not-a-generator table and the closure list are your challenge
ammunition, and misquoting them is worse than not citing them.

## The interview

Work through seven probes, in roughly this order (skip what the
user's description already answers — re-asking the known reads as
not listening). Ask at most three questions per round, one round at a
time, and commit to reading the answer before the next round. Where
the answer space is genuinely enumerable, use the structured question
tool; otherwise ask in prose. The probes are ordered so that each
one's answers feed the next — facts before names, names before
fences, fences before folds.

**Probe 1 — Facts (the truth plane).** What statements does this
system accumulate that are never retracted? Not tables, not objects:
statements. "Order 123 was placed", "sensor S read 40 at position p",
"agent A proposed schema X". Everything monotone lands here as a
kinded fact. If the user answers with mutable nouns ("we store user
profiles"), decompose: which parts of that noun are facts that only
accumulate, and which are a *name* that gets rebound?

**Probe 2 — Names (the directory plane).** What appears to "update"?
Challenge every update: an update is a new fact about a name, plus a
read that takes the greatest one. If a thing seems to mutate, it is a
name pointing at a succession of immutable values. Ask what the name
is, who may rebind it, and whether readers need the latest or a
pinned version.

**Probe 3 — Fences (the demotion challenge).** What genuinely
requires one winner? This is the most important probe, because fences
are the only expensive rung and nearly every claimed fence demotes.
For each candidate: could both candidates land as facts, with the
choice deferred to a read? Could the "conflict" be a join (compatible
knowledge)? Could it be a measurement (usage settles it)? A fence
survives only if the world outside the system needs exactly one
outcome (a payment, an external side effect, an authoritative
rebind). Every survivor needs a named token/writ holder.

**Probe 4 — Reads (folds, rungs, carriers).** What questions does
the system answer? For each: is the answer sensitive to arrival
order? To duplicates? The answers assign the rung — commutative +
idempotent (semilattice) reads the set plane; counting (monoid) needs
the multiset presentation; positional needs the sequence plane and an
anchor that carries positions. The rung then assigns the carrier
mechanically (see `planes-and-ladder.md`). If a read wants order
sensitivity *and* the cheap plane, that is a contradiction to surface,
not to paper over.

**Probe 5 — Outflows (the coalgebra).** What leaves the system —
views, notifications, exports, served bytes? Each outflow should be a
declared fold plus a subscription (consumer state), scoped by a writ.
An outflow nobody declared is the egress law's counterexample; name
it.

**Probe 6 — Liveness.** What must be "running"? Rewrite every
liveness claim as an observed fold: not "the worker is alive" but
"heartbeat facts exist past position p, and here is the fold a reader
runs with their own staleness tolerance." The system never promises
aliveness; readers measure it. Anything that genuinely cannot be
rewritten this way is host engineering (scheduling, backpressure) —
record it in honest bounds, don't force it into the algebra.

**Probe 7 — Sentences.** Write five or more example sentences the
system would speak, using the eight generators, in the prose register
of `generators.md`. Then write at least three things the system must
NOT be able to say, each mapped to a closure row. If a needed
sentence has no lawful form, that is the finding of the session —
either the mapping is wrong or a grill item exists.

## Grill discipline — standing challenges

These fire on the user's answers throughout, because the common
failure is accepting the first framing. Challenge, explain why, and
let the user overrule with reasons (they hold the seal; the mapping
records their ruling either way):

- **No wall clocks in meaning.** Any "when", "latest", "timeout", or
  "expired" converts to positions, tick facts, or a fenced deadline
  authority. There is no time coordinate; there are anchors.
- **No exactly-once.** If the design needs it, the design is wrong:
  idempotent joins make at-least-once free. Say so.
- **One equality.** A second CAS, a second source of durable truth,
  or a channel that "owns" different facts is the failure mode.
  Metadata is kinds, not channels; carriers multiply, truth doesn't.
- **Every fence attempts demotion first**, in writing, in the
  mapping. A fence without a recorded failed demotion is a smell.
- **Every verb that isn't one of the eight** gets looked up in the
  not-a-generator table: it is either a composition (show it) or
  refused (cite why).
- **Pre-register a law candidate.** Every mapping hunts the one law
  that would extend safety by construction for this system. State it
  in one sentence, mark it stated-only.
- **Honest bounds are mandatory.** Scheduling policy, retention
  economics, backpressure, key custody, and anything liveness-shaped
  stay outside the algebra. A mapping claiming total coverage is
  wrong.

## Output format

ALWAYS produce this exact document at the end (and offer to file it
under `scratch/research/` or `docs/design/` as the user prefers):

```markdown
# Algebra mapping: <system>
Status: EXPLORATORY, interview-derived <date>, pending grill.

## 1. The system, restated (one outsider-legible paragraph)
## 2. Truth plane — facts that accumulate
| Fact | Kind | Emitted by | Why never retracted |
## 3. Directory plane — names
| Name | Who rebinds (writ) | Read discipline (greatest / pinned) |
## 4. Fence inventory — survivors of the demotion challenge
| Exclusive act | The failed demotion (why it isn't monotone) | Token/writ holder |
## 5. Fold table — every question the system answers
| Question | Reduction | Rung | Carrier | Anchor policy |
## 6. Liveness plane — coalgebras
| Outflow / process | Consumer state | Productivity measured by |
## 7. Sentences
(5+ lawful sentences; 3+ unsayables, each citing its closure row)
## 8. Candidate law (pre-registered, stated-only)
## 9. Honest bounds
```

Every row in sections 2–6 must trace to an interview answer — if you
had to invent a row, you skipped a question. Keep the prose register
outsider-legible: gloss house terms on first use, because mappings
get read by people who weren't in the interview.

# Worked examples — the harness anatomy and the provision lane

Cut from `docs/design/2026-08-18-plait-kernel-algebra.md` §8 and
`scratch/research/2026-08-18-algebra-engine-architecture.md` (§7,
§10.3). Use when the user's system resembles a known harness
component, and as calibration for what a finished mapping's quality
bar looks like.

## The method's existence proof: the provision lane

The full derivation loop, run end to end once, so every mapping can
imitate it: take a harness subsystem (Effect's dependency
environment), find its algebra (requirements = unfilled holes;
provision = a newest-first event fold), prove the correspondence
(override-idempotence, append-union, disjoint-commutation, and the
collapse theorem: the fold equals a positioned greatest-read), and
the carrier falls out mechanically (NATS KV last-per-subject IS the
greatest-read). Dependency injection turned out to be a directory.
That is the standard of "mapped": algebra found, law stated or
proved, carrier assigned by rung, sugar projected last.

## The eighteen harness components, mapped

The reference anatomy is the eighteen-component inventory of
production agent harnesses (LangChain, Trivedy 2026). The claim: the
anatomy collapses into the alphabet plus composition, and the refused
rows are the argument, not gaps — a component is refused when the
kernel already carries its lawful content, because carrying it twice
is the two-sources-of-durable-truth failure mode.

| # | Harness component | Kernel answer | Generators / notes |
| --- | --- | --- | --- |
| 1 | System prompts | context programs: cataloged, digest-anchored; what the model saw is one digest | declare + fold |
| 2 | Tools / skills / MCPs | capability declarations with cataloged schemas; toolkits are declared sets | declare |
| 3 | Tool descriptions | derived renderings, served-equals-derived — a hand-written tool list is refused | fold over the catalog |
| 4 | Filesystem abstractions | refused as a truth store: catalog + blob store are the store; scratch disk is outside meaning | declare / resolve |
| 5 | Bash / code execution | an action at the boundary: declaration → fenced outcome → attested evidence | declare + decide + emit |
| 6 | Sandboxes | outside meaning — a sandbox bounds how code runs, never which action is permitted; permissions are writs | spawn carries authority |
| 7 | Environment tooling | the environmental band only: bootstrap, credentials as Redacted; everything semantic is cataloged | declare for semantics |
| 8 | Git integration | refused: we are the Merkle DAG — a second DAG would be a second source of truth | declare / emit / fold |
| 9 | Memory systems | the substrate read at declared coordinates: cells (working), journal spans + anchors (episodic), catalog (declarative) | join / emit+fold / declare+resolve |
| 10 | Web search | an edge capability: action out, attributed evidence in; indexes over results are anchored folds | declare + decide + emit; fold |
| 11 | Context compaction | retention as law: cataloged policy, derived horizon, fenced compaction preserving (head, state digest) | fold + decide |
| 12 | Tool output offloading | the inline/blob threshold: large payloads ride the blob store by digest reference | declare + resolve |
| 13 | Progressive disclosure | resolve-on-demand by construction: context carries digests; an agent sees what its writ licenses | resolve; spawn |
| 14 | Planning support | plans are declared values; the plan/build seam is a typed declaration, not a conversation | declare |
| 15 | Self-verification | the certifier + the commit door: constrained decode at the seam, conformance refusal at landing | decide's door; emit |
| 16 | Retry-until-accepted loops | acceptance sessions: rubric as protocol value, iteration as successor rounds, done as close at declared authority | emit + decide |
| 17 | Orchestration logic | refused: no orchestrator exists — coordination is registers, reactions are triggers, delegation is meets | trigger + decide + spawn |
| 18 | Hooks / middleware | monotone hooks are triggers (five productions); veto-shaped hooks are door refusals; the deadline seat is the one door for acting on silence | trigger |

## Harness needs on the cost ladder

| Harness need | Classical analog | Estate construct | Tier | Law that buys the tier |
| --- | --- | --- | --- | --- |
| working context | registers/RAM | session consumer + anchored reads | T1–T2 | positions are read-plane |
| long-term memory | disk | resolve name → fetch dot | T2, then T1 forever | digests never invalidate |
| search | on-disk index | declared reduction, incrementally maintained | T1 query / T2 maintain | associativity ⇒ incrementality |
| logging | append-only file | emit — the journal IS the log | T0+T2 | idempotent join ⇒ retries free |
| deps / config | DI container | provision fold = KV greatest-read | T2 | the proven correspondence |
| locks / coordination | mutex, consensus | decide, expected-sequence | T4 | CALM: only non-monotone pays |
| cache | L1/L2 | digest-keyed memo | T1 | content addressing |
| replication | RAID, backup | placement facts; ≥k as a measured fold | T3 background | placement = hint plane |
| compaction | defrag/GC | distillation fold + fenced rebind | T3 + one T4 | view change, not data change |
| runtime verification | CI, hope | the door, always on | T0 / T2 | stability split = cost split |
| escalation | page the on-call | grill / seal | T5 | fences price authority |

## How to use these tables in an interview

Don't paste them at the user. When their system resembles a row,
carry the row's *shape* into the questions: "your notification system
sounds like row 18 — the monotone half is a trigger, but you
described a timeout, and acting on silence is the one thing triggers
can't say. Who holds the deadline authority?" The mapping earns its
keep in the rows where the user's system does NOT fit — that is
either a composition to exhibit or a grill item to record, never a
reason to bend a definition.

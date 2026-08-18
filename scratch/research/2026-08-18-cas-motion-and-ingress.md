# CAS motion and message ingress: frontiers, cadence, and the two-plane split

Status: EXPLORATORY consultation note, coordinator-written 2026-08-18
at the operator's direction, saving the walkthrough exchange on
visualizing "movement" of the CAS and modeling agent-message
ingestion. Companions: the architecture abstractions note
(scratch/research/2026-08-18-algebra-engine-architecture.md, esp. §5
duplex and §10 cost ladder) and the freshly pinned KM-22/KM-23 rows
(docs/research/2026-08-18-kernel-model-notes.md). Standing fences
ride: safety only; attribution fence.

## 1. Door growth, precisely (the clarification that opened the exchange)

"Door growth" in KM-20 is growth of the WORLD the door consults,
never of the door's rules. The sixteen refusal reasons and their
checks are pinned at a language version; what grows is catalog
membership and the writ universe. Formally the door is
`admit(world, candidate)`, and door growth is `world ⊆ world'`.
Multi-agent activity is exactly what drives it: every admitted
declare any agent pushes enlarges everyone else's world.

The three KM-20 theorems, read operationally for a fleet:

- `admit_monotone` — nothing anyone else says can invalidate your
  lawful sentence; admission survives the world filling in around
  it. This is what lets a thousand agents write concurrently without
  re-checking each other.
- `intrinsic_fault_refused_everywhere` — an unlawful shape (clock
  read, unfenced decide, cross-sort comparison) refuses at EVERY
  world; no one else's declarations can save you; the only repair is
  rewriting. The competence-error half.
- `relative_refusal_repairable_by_growth` — every door-relative
  refusal (forward reference, off-writ referent) admits unchanged at
  some larger world: someone declares the referent or the authority
  grants the writ. The ignorance half — wait or ask, don't rewrite.

Precision: not every emission moves the door. Lane evidence changes
what FOLDS say; admission consults catalog membership and the writ
universe specifically — both monotone, which is why the family is
CALM-at-the-door. Caveat stated as always: on multi-fault candidates
the refused STATUS is stable under growth, not the reason string.

## 2. The CAS never updates — visualize the frontiers

A set only accretes; there is no motion in the truth plane to draw.
All motion lives at frontiers, at very different speeds:

| What moves | Plane | Expected cadence |
| --- | --- | --- |
| lane heads (emissions, messages, ticks) | positioned | fast — machine-paced, the hot plane |
| cell states (joins, measurements) | set | medium — measurement-paced |
| new declarations (schemas, programs, skills) | set + directory | low — minting-paced |
| greatest bindings (name rebinds) | directory | rare and salient |
| fenced outcomes | fence | rare — priced |
| anchors (each consumer's read position) | read | consumer-paced |

Visualization principle: **draw the frontiers, resolve the dots on
demand.** The set is unbounded and mostly cold; the frontier is
small and hot. A live view is: per-lane head positions; per-consumer
anchor lag (head minus anchor = honest staleness, no clock);
directory rebinds highlighted because rare; refusal-rate-at-anchor
as the alignment gauge (the capstone's metric). The UI itself is a
coalgebra: it subscribes (a watch is a consumer), receives pushed
deltas at T2, and never polls. "How often does it update" has the
honest answer: exactly as often as the lanes it watches advance —
real rates are AE-7's job to measure; the architecture guarantees
only that folds absorb any rate incrementally.

## 3. Message ingress: the two-plane split

The operator's two candidate models — "each message behind one
digest on a persistence carrier address" and "all messages as one
class" — are both right, on different planes. The rule of thumb:

**One class as bytes, many kinds as meaning, any layout as carriage.**

    ingress:  message ──admit──▶ splits into
      content plane (what was said):   canonical bytes → ONE digest (the dot, stored once)
                                       → placement facts (join like evidence)
                                       → carrier segment/blob (batching invisible to meaning)
      event plane (that it was said):  attributed, kinded fact citing the digest
                                       → lane position p (the head advances)
                                       → folds + anchors (views catch up, lag honest)

- **As identity: yes, one digest per message on a carrier address.**
  This is KM-23's two-plane dot applied to chatter. Free
  consequences: identical messages dedup themselves across agents
  (same bytes, same digest); batching is a placement-plane choice —
  ten thousand small messages in one segment with digest →
  segment+offset placement facts, log-structured, invisible to every
  fold.
- **As meaning: never one class.** The event is a kinded, attributed
  fact on a session lane ("agent A said ⟨digest⟩ at position p").
  Kinds discriminate — claim, tool result, instruction, refusal,
  repair are different kinds on different lanes — because folds and
  writs operate per-kind. Flattening to one "message" class forces
  re-parsing meaning downstream, the exact failure the kind system
  exists to prevent.
- **Claims tier for utterances.** The journal records THAT A said X
  as truth; whether X holds stays untrusted testimony until verified
  and promoted. The saying is a fact; the said is a claim.
- **Retention splits cleanly.** Content dots are cheap to keep
  forever (cold carrier, dedup'd); the hot event lane compacts by
  the lawful route — a distillation fold emits a summary dot pinned
  to the anchor interval it compresses, and the read root rebinds.
  You never choose between keeping all chatter and losing history;
  you choose which plane pays.

## 4. Honest bounds

Actual rates are unmeasured until AE-7 runs. UI-side flow control
(how a view sheds load when a lane runs hot) is coalgebra host
engineering the algebra is silent on — NATS pull consumers give the
primitive; each view picks its own pace. The ingress pipeline's
per-stage pricing (T0 admit, T2 append, T3 blob put when large) is
an ordering claim, not a measurement.

# REF program — board breakdown and dispatch plan

Status: dispatch plan, authored 2026-08-16 by the coordinator under
operator-delegated correction authority, after the REF-0 grill closed
and its record gained the same-day amendments (see the grill record's
amendments section). Companion documents: draft 17 (the ladder —
slice bodies), draft 18 (the REF-0 spike body), draft 19 (the
research questions). Issue numbers are the board's to assign; names
here are REF-E (the epic), REF-0..REF-9, RQ-1..RQ-9.

## Operator direction on record (2026-08-16)

- **WASM-centered.** The operator's stated read: the verification
  and build-cycle goals center on wasm operations. Consequence: the
  wasm lane is the program's center of gravity and the native lane
  is contingency only; research findings that would weaken the wasm
  thesis (RQ-3, RQ-6) are decision-changing and front-loaded. The
  spike still runs both lanes — a read is a prior, not a
  measurement, and the pre-registered thresholds govern.
- **Build on the proved calculus.** Confidence in the Lean approach
  to the move calculus is affirmed; the critical path is the proof
  spine (REF-1 → REF-2 → REF-3), and the gap to the daemons is
  confronted head-on by the equation plus the generated kernel, not
  by more testing.
- **OCaml eliminated** as kernel or proof language (grill record,
  named-and-killed; the REF-8 independent-checker niche preserved).

## Status update — 2026-08-16, post-sweep

The nine-RQ sweep completed same-day (19 agents, 9/9 researched and
independently verified, zero failures; synthesis at
`docs/research/2026-08-16-rq-synthesis.md`). No ratified decision
reversed. The operator then ruled on the re-grills and the spike
(grill record, "Post-sweep rulings"): REF-8 gates on host
independence; the float leaf leaves v0 (brief 21, URGENT before
DEV-670 generates); the spike re-scopes to the wasm lane (native
discharged by RQ-1's verified example); lane-invariant model work
dispatches now — hygiene gates (brief 22), REF-2a spec under the
float ruling, REF-1 spec adopting the ruled `Moves.Wire` /
journal-outside-`stateBytes` / canonical-opBytes answers. Wave 0's
research rows are complete; its spike row is the re-scoped draft 18.
Later 2026-08-17: roster ratified wholesale and implemented; briefs
21/22 built by codex on `agent/codex/kernel-hygiene-gates` and
Rev-reviewed (verdict FINDINGS — 1 blocker, cures ruled and
dispatched as brief 25: literal scalars narrow to integers, opaque
ruled uninterpreted-canonical-bytes); REF specs authored (23, 24)
awaiting sign-off; DEV-670 fourth re-pin posted (generation barrier
until the cured branch merges).

## The epic (board parent body)

> **REF — model-to-daemon conformance by proven artifact creation.**
> Close S1 (model↔protod) and S7 (model↔TS kernel) by stating the
> correspondence as a machine-checked theorem where proof reaches,
> generating the running seam from the proved model where proof
> cannot cross languages, and certifying the remainder with the
> DEV-670/DEV-672 corpus and oracle machinery. Terminal artifact: a
> demonstrated update cycle (REF-9) installing the standing law —
> **no silent drift channel**: any semantic change to the calculus
> re-proves and regenerates every downstream artifact, or the build
> fails. Slice bodies live in draft 17; every gate is a command that
> exits nonzero when its claim is false. The moves↔protod gap stays
> HELD, not closed, until REF-3 proves the equation — no
> intermediate slice claims otherwise.

## Waves

### Wave 0 — dispatchable now (all parallel; nothing here is blocked)

| Issue | Body | Blocked on | Seat |
| --- | --- | --- | --- |
| REF-0 spike | draft 18 | nothing | Eng (codex); operator ratifies lane selection |
| RQ-2 extraction proved-or-trusted | draft 19 | nothing | research (codex) |
| RQ-3 wasm for verified code | draft 19 | nothing | research (codex) |
| RQ-9 RFC 8785 numbers in Lean | draft 19 | nothing | research (codex) |
| RQ-1 Lean C backend mechanics | draft 19 | nothing | research (codex) |
| RQ-6 byte-identical artifacts | draft 19 | nothing | research (codex) |
| RQ-8 proof maintenance | draft 19 | nothing | research (codex) |
| RQ-5 CI proof gates | draft 19 | nothing | research (codex) |
| RQ-4 verify-existing alternative | draft 19 | nothing | research (codex) |
| RQ-7 certificates | draft 19 | nothing | research (codex) |

Priority within the wave if capacity binds (draft 19's order,
restated): decision-changers first (RQ-2, RQ-3, RQ-9), then spike
support (RQ-1) and gate-wording input (RQ-6), then REF-1 shaping
(RQ-8), then RQ-5, RQ-4, RQ-7.

Execution note (operator order, 2026-08-16): the nine RQs run as a
coordinator-driven multi-agent Opus research-and-verify workflow
rather than the codex seat — one researcher per question grounded in
retrieved primary artifacts (real repository code, specifications,
papers; quoted verbatim with URL and retrieval date), an independent
adversarial verifier per report appending a verification addendum to
each, and a synthesis pass mapping findings onto the open decision
inputs. Opus 5 at max effort is the highest class dispatched.
Draft 19's dispatch discipline binds the workflow verbatim; reports
and the reference area land at the paths draft 19 names; the
operator ratifies before anything is committed.

DEV-670 (the wall) is not part of this program; it is the program's
inbound dependency, already dispatched on its own track.

### Wave 1 — the concrete model (after DEV-670; see the open recommendation)

| Issue | Body | Blocked on | Opens with |
| --- | --- | --- | --- |
| REF-1 wire model | draft 17 §REF-1 | DEV-670; RQ-8's layout answer wanted first | two spec decisions: the model's home (`verify/wire/` vs `Moves.Wire`), `stateBytes` contents |
| REF-2 canonical value law | draft 17 §REF-2 | DEV-670; RQ-9's scope recommendation | expected split: REF-2a structural laws / REF-2b number formatting, per RQ-9 |

### Wave 2 — the equation and the kernel

| Issue | Body | Blocked on |
| --- | --- | --- |
| REF-3 refinement equation (fill) | draft 17 §REF-3 | REF-1, REF-2 |
| REF-4 close/fence/digest | draft 17 §REF-4 | REF-3 |
| REF-5 divergence burn-down | draft 17 §REF-5 | REF-3 (runs beside REF-4) |
| REF-6 the kernel | draft 17 §REF-6 | REF-0 lane selection, REF-1, DEV-670 instruments; may start before REF-5 completes, cannot cut over |

### Wave 3 — cutover and the living model

| Issue | Body | Blocked on |
| --- | --- | --- |
| REF-7 runtime cutover; S1+S7 → `proved` | draft 17 §REF-7 | REF-4, REF-5, REF-6; DEV-672 re-aimed here |
| REF-8 session certificates | draft 17 §REF-8 | REF-7 |
| REF-9 the living model, demonstrated | draft 17 §REF-9 | REF-8 |

## Lane-invariance (RATIFIED 2026-08-16, post-sweep ruling 4)

REF-1 through REF-5 are pure Lean and identical under either binding
lane — and even under D-a's generator fallback — so they dispatch on
their own blockers while the spike runs. The spike gates REF-6
onward: everything that consumes the lane choice. The residual risk
originally stated here is now retired by evidence: the native lane
is proven (RQ-1), so an extraction path exists regardless of the
spike's outcome.

## Decision inputs

| Decision | Status | Detail |
| --- | --- | --- |
| REF-8 independence reading | **RULED 2026-08-16** | host independence gates; build independence discharged by REF-6; checker + builder readings named for later slices |
| Float leaf / REF-2 scope | **RULED 2026-08-16** | float leaves v0 (brief 21); REF-2a now, REF-2b pre-registered |
| Wire model home | **RULED 2026-08-16** | `Moves.Wire` inside verify/moves, on RQ-8's measured evidence |
| `stateBytes` contents | **RULED 2026-08-16** | theorems' footprint only; journal host-owned, records canonical opBytes |
| REF-1..5 early dispatch | **RULED 2026-08-16** | yes — lane-invariant work proceeds beside the spike |
| Lane selection (wasm vs native) | open | re-scoped spike's T1–T4 + per-instance data + three RQ-3 records; due REF-6 dispatch |
| REF-6 reproducibility gate final wording | open | RQ-6's answer in hand (do NOT promote cross-platform build identity); final wording fixed at REF-6 dispatch |
| Sweep reword roster (synthesis §5) | **RULED 2026-08-16** | ratified wholesale; implemented across grill record + drafts 17/18; report bodies stand with their addenda |

## Cadence and seats

House rules apply unchanged: the issue body is the whole scope; Eng
builds on `agent/<name>/<issue>`; Rev posts findings; the operator
ratifies and merges; every task keeps a DECISIONS log; findings
before fixes. Research issues follow draft 19's dispatch discipline
verbatim (sources dated, "I ran it" outranks docs, absence is a
finding, no invented APIs, recommendations carry their costs).

## What this plan does not change

DEV-664's remaining stages (first real session, author one type, the
join, the payoff) continue on the running system in parallel; REF-7
is the single point where this program touches the daemon, and it
lands only after REF-5 has ratified every behavioral divergence.
Standing evidence walls (proto conformance, `verify/*` gates, the
JCS differential wall) stay green throughout; nothing in this
program licenses touching them except REF-4's contract-test
retirement and REF-7's cutover, each in its own gated commit.

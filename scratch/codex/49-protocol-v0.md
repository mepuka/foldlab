# Task 49 — flb.protocol.v0 + the session runtime: the acceptance protocol, dogfooded

Authority: the protocol grill record
(docs/design/2026-08-14-protocol-grill-record.md — rulings G1–G6, all
operator-ratified), verify/moves (merged `5afdb1864` — the model rule
this task's Go step must mirror), the lit synthesis D1–D6. Base: main.
Own worktree, branch codex/protocol-v0. Scope: proto/ (go/protod, ts,
CONTRACT/DECISIONS, wire fixtures where authorized) only. Root and
proto gates green; verify/moves/run.sh untouched and green.

## What this builds

The first protocol value and the daemon machinery to run sessions of
it. The consumer is the estate's own task-acceptance flow; task 50 will
run through it for real. Keep the wire surface SMALL: four verbs.

## 1. The protocol record — flb.protocol.v0

A cataloged value (created via the existing certify/create path; the
daemon recomputes its digest from canonical bytes like any other
value):

```json
{
  "scheme": "flb.protocol.v0",
  "name": "task-acceptance",
  "seats": ["operator", "coordinator", "builder"],
  "holes": [
    {"name": "spec",          "type": "<digest>", "seats": ["coordinator"]},
    {"name": "authorization", "type": "<digest>", "seats": ["operator"]},
    {"name": "build_report",  "type": "<digest>", "seats": ["builder"]},
    {"name": "review",        "type": "<digest>", "seats": ["coordinator"]},
    {"name": "decision",      "type": "<digest>",
     "seats": ["coordinator", "operator"],
     "fence": {"rule": "seat-authority", "order": ["operator", "coordinator"]}}
  ],
  "identity": "trusted-principals",
  "liveness": ["builder", "coordinator", "operator"]
}
```

Validation at create: seats nonempty and unique; every hole's seats ⊆
seats; every multi-seat hole carries a fence; fence order is a
permutation of that hole's seats; type digests RESOLVE in the catalog
(unresolvable → the existing absence-sort refusal). Single-seat holes
must NOT carry a fence (refuse — no dead configuration).

## 2. The four hole types (create first, commit the bootstrap)

Via the existing flb.type.v0 grammar, as a committed bootstrap script
or documented setup (your choice; record it): `task.spec.v0`
{title: string, body_digest: string}; `task.authorization.v0`
{granted: boolean, note?: string}; `task.build_report.v0`
{commit: string, gates: string, notes?: string}; `task.review.v0`
{findings: array of {title: string, severity: string, note: string}} —
empty findings array is a legal, meaningful fill (clean review).
`task.decision.v0` {verdict: "accept" | "revise" | "reject",
note?: string}. (Five types; decision's enum via the grammar's union
of literals — follow the grammar as it exists on main; if a shape is
inexpressible, choose the nearest expressible shape and record the
decision.)

## 3. The session runtime (protod)

State per session: protocol digest, seat→principal bindings, per-hole
state, per-hole evidence pairs, status (open | closed), predecessor
(optional: prior session id + its final state digest), and the
journaled move history via the existing session/journal machinery.

Verbs (register via contract.describe like everything else; MCP tools
derive, never hand-written):

- **protocol.session.open** {protocol: digest, bindings:
  {seat: principal, ...}, predecessor?: {session, state_digest}} →
  {session, head}. Refuse: unresolvable protocol digest (absence
  sort); bindings not covering every seat exactly once; unknown seat
  names.
- **protocol.session.fill** {session, principal, hole, value} →
  {head, hole_state} | refusal. Semantics MUST mirror verify/moves
  `step` + `repair` exactly (the model rule; Model.lean:136-152 and
  245-252):
  - principal must hold a seat listed for the hole (refuse:
    seat-unauthorized, structural sort);
  - value must decode against the hole's type (existing constrained
    decode + type check; refuse structural);
  - fill on open → filled, evidence {(value, seat)};
  - fill on filled with byte-identical value → success, unchanged
    (idempotent — safe redelivery);
  - fill on filled with different value, DIFFERENT seat → the repair:
    state becomes disputed with candidates = evidence ∪ {(value,
    seat)}; reply says so (this is a success carrying the dispute,
    not an error);
  - fill on filled with different value, SAME seat → refusal
    (no self-revision — D3; teach: "correction is a new round");
  - fill on disputed or decided → refusal (mirror the model: the
    Lean step refuses; do not invent candidate-append-via-fill);
  - fill on a closed session → refusal (session-closed sort).
- **protocol.session.close** {session, principal} → {head, outcome} |
  refusal. Only the principal bound to the OPERATOR seat may close
  (refuse otherwise; this is G5's structural override — do not add a
  coordinator close path). Close, atomically under the session's
  existing single-goroutine discipline:
  1. every disputed hole → decided by its fence rule. seat-authority:
     among candidate pairs, pick the value whose seat ranks earliest
     in the declared order (each seat contributes at most one value —
     self-revision is refused — so this is total and deterministic);
  2. every filled hole → sealed (record stability);
  3. every open hole → recorded unfilled;
  4. outcome = "completed" if decision ∈ {filled, decided} else
     "abandoned";
  5. status = closed; final state digest recorded; reply carries the
     head it was computed under (the task-47 snapshot discipline —
     capture (seq, head) inside the critical section).
  Second close → refusal. 
- **protocol.session.state** {session} → the full fold: per hole
  {state, value?, candidates?, sealed?}, bindings, status, outcome?,
  predecessor?, head. Read-only, verify-on-read per house law.

## 4. Conformance to the proved model (the wall)

A shared fixture (proto wire fixtures dir, new file authorized:
`protocol-moves.json`): vectors of (pre-state, move, expected
post-state | refusal) covering AT MINIMUM: fill-on-open; idempotent
refill; conflicting fill → dispute with both pairs; same-seat
conflicting fill → refusal; fill on disputed → refusal; fill on
decided → refusal; unauthorized seat → refusal; close seals filled;
close fences disputed by seat order (BOTH orders of arrival — same
outcome, the path-independence wall); close on empty decision →
abandoned; post-close fill → refusal. Go tests drive the vectors
through the real session runtime; TS tests drive the same vectors
through the client decode path. README/ledger language: the vectors
are a WALL against the proved model rule, not a correspondence proof —
use exactly that sentence discipline.

## 5. MCP

protocol.session.{open,fill,close,state} + protocol.create derived
from contract.describe at startup (the concierge pattern — no
hand-written tool list). Output envelopes follow the existing MCP
envelope discipline on main.

## 6. Gates and evidence

- proto go: gofmt, vet, test; proto ts: tsc, test; root: typecheck +
  test green and untouched; verify/moves/run.sh still green
  (untouched).
- New fixture committed with provenance line per house style.
- DECISIONS.md: append dated entries for every decision this spec
  leaves open (type-shape nearest-expressible choices, subject naming,
  bootstrap form) — what/alternatives/why/load-bearing flag.
- VERIFICATION.md: no new claims; if you add a row for the conformance
  wall, scope it as single-daemon, vectors-only.

## Out of scope (grill-ratified; do not build)

Crypto identity; multiple venues; dynamic hole sets; dispute reasons /
attack kinds / grounded semantics; UNDECIDED beyond "abandoned"; push
watch (state polling suffices); timeouts or any bounded-time behavior;
a client `dispute` or `decide` verb (disputes arise only via the
repair; decisions only via the close-fence). Any edit outside proto/
except the optional scoped VERIFICATION row.

---

# Acceptance review (2026-08-14, coordinator) — one finding, fix before merge

Reviewed at `f22a6c6aa`. All gates green and independently re-run:
proto go (gofmt/vet/test), proto ts (tsc/test 144 pass), root
(typecheck + 220 tests), and verify/moves/run.sh still PASS with its
axiom check. All twelve conformance vectors present and correctly
named, including BOTH arrival orders of the fence dispute
(`fence-coordinator-arrives-first` / `fence-operator-arrives-first`) —
the path-independence wall the spec asked for.

Semantics reviewed line by line against the proved Lean rule
(verify/moves Model.lean:136-152, 245-252): fill-on-open, idempotent
refill by canonical bytes, cross-seat conflict → pair-attributed
dispute, same-seat conflict → refusal that teaches "correction is a new
round", fill on disputed/decided → refusal, seat authorization, and
close performing fence→seal→record with the reply head captured inside
the critical section (the task-47 snapshot discipline, correctly
applied). The fence is seat-authority over the candidate pair-set —
order-independent by construction, matching the generalized theorem.
The fold's replay validates stored events rather than trusting them
(applyProtocolEvent re-derives seat authorization, re-checks value
conformance, and re-computes the close digest) — that is verify-on-read
applied to session state, and it is better than the spec asked for.

## FINDING-49-COMPLETION (fix before merge)

`protocol_session.go:368` and `:525` hardcode the hole name
`"decision"` to compute a session's outcome, but `protocol.go`'s
validation never requires a hole with that name. Consequence: any
protocol value OTHER than task-acceptance closes as `"abandoned"`
forever, silently — no refusal, no warning, no test failure, because
the only protocol in the fixtures happens to use that name.

This is a COORDINATOR SPEC DEFECT, not a builder error: task 49 §3
literally said `outcome = "completed" if decision ∈ {filled, decided}`.
Codex implemented the spec faithfully. The spec baked one protocol's
hole name into a generic scheme.

Why fix before merge rather than after: `flb.protocol.v0` is a
CATALOGED SCHEME. Its canonical bytes become the identity of the first
real protocol value, and every session references that digest. Changing
the record's shape after the first real session exists means a new
digest plus a migration for anything that cited the old one. Record
shapes are the cheapest thing to fix before first use and among the
most expensive after.

The fix (small, one field): add a required `completion` field to
`flb.protocol.v0` — a non-empty list of HOLE names, validated as a
subset of declared hole names (refuse unknown names, refuse empty, and
refuse duplicates, matching the existing seats/liveness validators).
Close computes: `outcome = "completed"` iff every hole named in
`completion` is `filled` or `decided`, else `"abandoned"`. Delete both
hardcoded `"decision"` lookups. The task-acceptance value declares
`"completion": ["decision"]`, so its behavior is unchanged and the
existing vectors keep their expected outcomes. Regenerate the protocol
fixture (authorized: this task owns it) and add ONE vector: a two-hole
protocol whose `completion` names a hole other than `decision`,
closing `completed` — the control proving the scheme is generic.

## Secondary observation (not blocking, no action required)

`protocol_session.go` has 23 `return nil` drop-the-reply paths. Most
are substrate failures, consistent with the documented house pattern
(dispatch.go:14,119). A few are fold-invariant assertions that are
unreachable by construction (e.g. the `len(candidates) != 1` guard in
fill). This matches the existing lost-reply class already tracked in
the architecture audit's backlog #4; task 49 neither worsens nor is
required to fix it. Recorded so the next reviewer does not re-find it.

## Otherwise: ACCEPT

DECISIONS.md entries are properly formed; CONTRACT.md documents the
four verbs; the MCP surface derives from contract.describe as required;
the bootstrap example exists; no unauthorized fixture was touched. On
the completion fix plus its new vector and green re-run, this merges.

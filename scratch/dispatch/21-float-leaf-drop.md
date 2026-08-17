# Float leaf drop — narrow the v0 value grammar before the corpus bakes

Status: dispatchable, **URGENT** — must land before DEV-670's corpus
generation fixes the value alphabet. Authority: post-sweep ruling 2,
`docs/design/2026-08-16-ref0-extraction-grill-record.md`. Evidence
base: RQ-9 (`docs/research/2026-08-16-rq9-rfc8785-numbers.md`, with
verification addendum).

## The ruling being executed

The mintable `{"k":"float"}` value leaf leaves the `flb.protocol.v0`
wire grammar. Rationale, recorded in the ruling: with the leaf gone,
REF-2a (structural canonicalization laws plus the integer number
path) satisfies REF-2's whole-grammar charter and the `proved`
status is reachable without formalizing shortest-round-trip
printing — the single hardest object in the surveyed field (1,865 of
3,296 lines in the only existing formalization). Floats re-enter, if
ever, through the REF-9 living-model loop with REF-2b as their
pre-registered proof obligation.

## Scope

1. **Survey first, then cut.** Enumerate every restatement of the
   value grammar that admits or names the float leaf: proto/SPEC.md
   (declared at line 71 as of the ruling), value_check.go, decode
   paths, TS mirrors in packages/, corpus/alphabet configuration,
   fixtures, docs. The drift-engine reality (the grammar restated
   ~6× in Go, ~4× in TS) means the survey list IS a deliverable:
   report every site touched and every site checked-and-clean.
2. **Remove the leaf from the grammar's declaration** in SPEC.md and
   from admission in value_check.go. A float-carrying fill must
   refuse through the existing unknown/unlawful-kind refusal path —
   if the existing refusal taxonomy does not cover it cleanly, that
   is a FINDING to report, not a name to invent.
3. **Fixtures.** If any frozen fixture carries a float-leaf row,
   regeneration is explicitly authorized by this brief with the
   stated reason "post-sweep ruling 2, float leaf leaves v0". Record
   which fixtures changed and why in the DECISIONS log.
4. **Negative control.** A committed test drives a float-leaf fill
   vector and asserts the named refusal — the grammar's narrowing
   made observable.

## Boundary — what this does NOT touch

The JCS seam is untouched. RFC 8785 canonicalization of arbitrary
JSON (go/canonical ≡ packages/core jcs, the differential wall,
`fixtures/jcs-rfc8785.json`) continues to handle all JSON numbers,
floats included — that wall is standing evidence for a different
seam. This brief narrows the PROTOCOL value grammar only. An
executor who finds themselves editing the JCS canonicalizers has
left scope and must stop and report.

## Gates (mechanical)

- `bun run gates` green (root, workspace, go, proto/go, proto/ts).
- Grep gate: no float kind admitted in SPEC.md's grammar section,
  value_check.go, or the corpus alphabet configuration; committed as
  a check so it cannot silently return.
- The negative-control refusal test green, refusal name asserted.
- Survey table committed in the closing report: every grammar
  restatement, touched or checked-clean.
- DECISIONS log entry per house rule (decided / alternatives / why /
  load-bearing).

## Coupling

DEV-670's corpus generator must exclude the float leaf from its
value alphabet: the DEV-670 brief needs a re-pin comment on the
board citing post-sweep ruling 2 — coordinator/operator act, named
here so it is not lost. REF-2a's spec (next dispatch) quantifies
over the narrowed grammar this brief produces.

Seats: Eng builds on `agent/<name>/<issue>`; Rev reviews; operator
ratifies and merges. The issue body is this brief.

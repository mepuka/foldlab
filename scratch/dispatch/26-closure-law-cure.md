# Cure round 2 — the closure law and the re-review findings

Status: dispatchable to the cure seat on
`agent/codex/kernel-hygiene-gates`; commits land on that branch; the
repair cites the round-2 report
`docs/research/2026-08-17-review-float-hygiene-cure.md`. Authority:
operator ruling 7 (grill record, Post-sweep rulings) plus the
re-review's findings dispositions. Round-1 context: brief 25 and
`docs/research/2026-08-16-review-float-hygiene-branch.md`.

## R1 — the closure law (blocker; ruling 7)

The integrality bound moves into the type walker's number-decoding
path: every JSON number anywhere in a type term passes
`isIntegralJSONNumber` (walk.go), with opaque payload bytes as the
sole exception (ruling 6). `check.args` is thereby closed, and so is
every future JSON-bearing position — the guard sits where numbers
are decoded, not where positions are enumerated. Sweep for committed
fixtures carrying non-integral numbers in args (a hit is a FINDING
with the vector, reported before any regeneration). Negative vectors:
the four canonical probes (5e-324, 0.1, 1e21, 1e-7) placed in
`check.args` positions, each refused with the named law; integral
args still admitted. TS mirror swept (author/session decode paths;
the concierge property generator's `jsonScalarArbitrary` for check
args narrows accordingly — round 1 deliberately left it wide, this
ruling flips it). GRAMMAR-SITES.md updated: the closure law is the
site list's new invariant, stated at the top.

## R2 — SPEC.md states the law once, and declares opaque

One prose law: "no position in a type term admits a non-integral
number; opaque payloads are uninterpreted canonical bytes." The
`check` production notes args' bound; the grammar block gains the
`{"k":"opaque"}` production its own amendment 3 ratified (the
declaration and the certifier must not disagree — the round-1 F1
defect class). SPEC edit authority: this brief, under rulings 6–7;
record per the recorded exception shape (proto/AGENTS.md).

## R3 — the regeneration gate exists (major)

The re-review proved the round-1 clause "joins the gate that already
covers the wirefix four" referenced a gate that does not exist for
ANY wirefix fixture. Build it: a Go test (or gates stage) that runs
`cmd/wirefix` into a temp dir and byte-diffs all five fixtures
(types, chains, frames, concierge, sessions) against the committed
bytes, failing on any drift — the house regeneration law made
mechanical for this family. While in docs/FREEZING.md, complete its
inventory: the five fixture rows the round-1 seat found missing
(owned-types-v1, scheme-bridges, protocol-moves, reply-conformance,
refusal-sorts) join the table with their actual freeze status —
recorded as they are, no status invented.

## R4 — the two minors

a. `verify/ir/IR/Semantics.lean:16–17`: the abstraction note
   predates ruling 5 and now points at the exact position the cure
   closed. Update the PROSE ONLY (no theorem, no definition) to
   state the true relationship: the model abstracts numerics to
   `Int`; post-ruling-5/7 the wire admits nothing the abstraction
   drops. `bash verify/ir/run.sh` green before and after;
   GRAMMAR-SITES.md's sites 15–16 are thereby visited per its own
   law.
b. Tracked docs citing coordinator records that are uncommitted
   (brief 25, the grill record, the findings reports): leave the
   citations as written — the records land on main at merge, which
   is the coordinator's stated plan — and add no NEW citation to an
   uncommitted path. Confirm in the closing report which cited paths
   remain uncommitted at your tip so the merging coordinator has the
   checklist.

## Acceptance (mechanical)

- Closure probes: the four vectors refused by name in `check.args`;
  integral args admitted; the round-1 literal and admission suites
  still green.
- The new regeneration gate green at tip — and demonstrated RED once
  against a one-byte fixture mutation, then restored (transcript in
  the report, plant/revert hygiene).
- `bun run gates` green at tip (the diff spans Go and TS);
  `bash verify/moves/run.sh` and `bash verify/ir/run.sh` green.
- SPEC.md grammar block and certifier agree (opaque declared; a
  grep-level check that every certifier kind appears in the grammar
  block joins the guards).
- DECISIONS entries per house format; GRAMMAR-SITES.md invariant
  stated; working-tree isolation held (coordinator's uncommitted
  records untouched, staging by explicit path only).

Seats: one cure seat, then the same-standard Rev re-review (round
3) over the round-2 diff — which also hunts, adversarially, for a
FOURTH member of the number-bearing family before approving. The
issue body is this brief plus the two review reports it cites.

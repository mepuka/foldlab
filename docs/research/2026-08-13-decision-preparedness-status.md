# Decision-preparedness status: issue #35 re-audit

2026-08-13 — re-audit of the twenty decisions in
[issue #35](https://github.com/mepuka/foldlab/issues/35), against current main,
the full issue record, the coordinator queue, and completed local lane heads.
This is a status register, not a new decision record: an unratified choice stays
unratified here.

## Audit boundary

- Worktree base: `d243cf871aabd7f2eb32bcd97a65ade6fb4116de`.
- During the audit `origin/main` advanced through `0c0955181`, `e3406c6de`,
  and `310fc18f3`; those commits add and index the learning-by-refutation
  dossier. They do not merge any executor lane, but the dossier independently
  confirms the unresolved refusal-corpus choices.
- Completed lane heads inspected directly: refusal sorts `89292529a`, MCP
  envelope `7a1b75e93`, catalog query `29a62296b`, no-dead-ends `facc3ade7`,
  owned encoding `e7aac7c71`, and session journal `068f51616`.
- `scratch/codex/` was readable on this machine but remains gitignored. Its
  addenda are executor instructions, not durable ratification unless the same
  choice also appears in an issue, ticket, ADR, or committed decision record.
- Status terms: **resolved on main**, **resolved branch-only**, **partial or
  contradictory**, and **still owed**. Branch-only means evidence exists but
  current main cannot consume it yet.

## The twenty decisions

### 1. Refusal sort: persisted datum or code property

**Status: partial and contradictory; durable disposition still owed.**

[Issue #18](https://github.com/mepuka/foldlab/issues/18) proposed both shapes
and has no ratifying comment. Task 30 Addendum 2 says `sort` is persisted and
the kind-to-sort table is frozen per grammar digest. The completed task-30
branch does the opposite: `proto/go/protod/refusal_sort_test.go` contains
`TestRefusalSortDoesNotRideOnTheWire`, and its decision log calls the table
server-side only. The merged learning-by-refutation dossier also records this
as an operator question, not a decision.

Do not merge the branch as satisfying the addendum. The operator still owes one
durable disposition, followed by either a persisted-field repair or an explicit
supersession of that addendum.

### 2. Corpus element encoding

**Status: still owed; task 32 remains correctly held.**

Task 32 Addendum 1 proposes the language-surface record
`(candidate_digest, grammar_digest, catalog_head, outcome)` plus the sort, but
explicitly labels it pending operator word. The counterexample dossier's
`(Law, Path, candidate, grammar)` shape still circulates. The newer
[learning-by-refutation dossier](https://github.com/mepuka/foldlab/blob/e3406c6dea1ab659ec278a452f1f4690b8a453d3/docs/design/2026-08-14-learning-by-refutation.md)
adds two requirements — candidate identity must survive bounded refusal display,
and law identity must not be prose — but deliberately does not choose a record.

One canonical `flb.certification.v0` encoding is still owed before task 32.

### 3. Catalog head on a mid-lag refusal

**Status: still owed; recommended answer exists, ratification does not.**

The durable designs require `catalog_head`, but the exact provenance remains the
unratified task-32 hold: the head actually resolved by the certifier,
daemon-journaled and never client-asserted. The named property test — same
candidate/grammar/head gives the same record, and a changed resolved head is a
different observation — has not been built.

### 4. Session compaction across the refusal-corpus seam

**Status: partial, with the correctness canary complete branch-only.**

[Issue #24](https://github.com/mepuka/foldlab/issues/24) durably ratified that
session compaction refuses until structural refusals can be exported and the
corpus digest seals the prefix. The session branch implements both Go and
TypeScript `compaction-blocked` paths and negative tests
(`session_test.go`, `session-journal.test.ts`). It also ships the memoizing-
frontier failure canary required by the same grill.

Still owed at integration: merge those canaries and add the task-37 Addendum 1
sentence to the public core `compact` documentation. At `068f51616`, that
sentence is absent from `packages/core/src/stream.ts`.

### 5. Fixture-freezing protocol for ticket 026

**Status: still owed and still blocking the scale gauntlet.**

[Ticket 026](../map/tickets/026-the-scale-gauntlet.md) remains open and would
create three new frozen authorities. `fixtures/stream-wall.json` and
`go/cmd/streamfix/main.go` still point to the nonexistent
`docs/primitives/MECH-attempts.md`. `wirefix` remains the only generator with a
working force-and-reason guard. ADR-0007 states what a corpus can certify, but
there is still no repository-wide protocol for creating, reviewing, regenerating,
and attributing a frozen authority.

### 6. Catalog-query execution seam: Go or TypeScript

**Status: partial; the probe and candidate implementation are complete, but the
reported choice has no durable ratification.**

The catalog-query branch chose the task-34 working assumption: Go hand-rolls the
fold and is checked against the TypeScript declared algebra by the shared
`proto/wire/fixtures/catalog-query.json` wall. Commit `29a62296b` contains the
Go query fold, TS twin, R0 fixture, and prefix-completeness tests. Its decision
log records the `(query digest, catalog head)` cache key and unchanged frozen
fold pin.

The task addendum said to probe and report rather than choose silently. The
evidence is now ready for ratification; the issue/decision record still needs to
adopt the Go-plus-wall seam before merge.

### 7. File-level ownership for tasks 29, 34, and 37

**Status: still owed; the predicted collision has materialized.**

All three branches are complete and independently edit `dispatch.go`, the
contract surface, clients/tests, and related fixtures. No task claim or fixture
regeneration assignment was posted to
[issue #22](https://github.com/mepuka/foldlab/issues/22). Integration now needs
an explicit merge order, one fixture owner, and a rebase/re-run of the derived
contract after each preceding lane. Issue-granularity claims were not enough.

### 8. Principal attribution on every session move

**Status: still owed; completed branch contradicts its executor binding.**

Task 37 Addendum 1 requires a principal on every move. The completed session
branch has `author` only on `open` and `submitter` only on `commit`; its
`sessionMoveRequest` and fill/unfill `sessionEvent` variants contain no
principal. No issue comment durably ratifies the addendum's broader
multi-author policy either.

Before merge, record the policy durably and add the field plus an end-to-end
attribution canary. Do not defer this to a later scheme bridge.

### 9. Reserved session prefix and unbypassable expected-head check

**Status: implemented branch-only; durable binding should be copied out of the
gitignored queue.**

The session branch reserves `flb_session_v0_` through the same generic-ingress
gate that reserves the catalog, tests that direct ingress refuses, and makes
`expectedHead` mandatory on every mutating request. Stale/missing-head tests
prove no session event is appended, and the reserved-prefix gate removes the
alternate write path. These are the required correctness canaries.

The durable [issue #24](https://github.com/mepuka/foldlab/issues/24) record
ratifies mandatory `expectedHead` but not the prefix/placement subchoices; copy
those bindings into the merge decision log.

### 10. Fold-cache acceptance criteria

**Status: partial; several original complaints are stale, the central residual
is not.**

Current main now has `proto/DECISIONS.md` D63-D64, declaration-admission law
tests, opaque cache storage, and adversarial structural-costume controls. The
original “no decisions log / no ADR-0010 tests” description is therefore stale.

The genuine-declaration re-host remains an explicit `KNOWN GAP` in
`packages/core/test/fold.cache.test.ts` and `fold.laws.test.ts`, reaches the
digest-keyed cache, and has no Go twin. No acceptance criteria were posted on
issue #22. Review may accept the branch only with that non-claim stated, or a
separate ratification may demand closure.

### 11. Gitignored executor specs as an asymmetric authority

**Status: still owed.**

The PC checkout can read `scratch/codex/`; a clone and the Mac coordinator
cannot. The directory is intentionally a handoff queue, not a durable spec
home. Items 1, 6, 8, and 9 demonstrate the cost: material bindings exist only
there or disagree with durable records. Acceptance laws and ratifications must
land in issue comments, tickets, ADRs, or committed decision logs before a
branch is judged against them.

### 12. Issue #20 board hygiene

**Status: resolved on main and on GitHub.**

[Issue #20](https://github.com/mepuka/foldlab/issues/20) is closed with commit
`a9dc142c3`. Generated commutativity/idempotence laws and the LWW discriminating
control are present in `packages/core/src/foldLaws.ts` and
`packages/core/test/fold.laws.test.ts`. Any ranking that still calls this
unbuilt is stale.

### 13. Full MCP conformance suite

**Status: partial branch-only; the P1-P14 suite is still owed.**

Task 29 commit `7a1b75e93` repairs the object-typed output envelope, asserts
every tool advertises it, includes the bare-union/Unknown negative control, and
pins zero resources until exact-match digest routing exists. That discharges
[issue #16](https://github.com/mepuka/foldlab/issues/16) F1 and guards F2's
current empty-resource state.

It does not choose the full conformance harness, transport, or repository home,
and does not implement the design dossier's P1-P14 suite. Those remain owed
before any digest-addressed resource ships.

### 14. Normalize cost bound

**Status: partial branch-only; production shape is bounded, the explicit cost
canary is missing.**

Task 36 Addendum 1 binds normalization to one structural traversal with no
production fixpoint iteration. Commit `e7aac7c71` implements recursive
normalization and generated totality/confluence/idempotence tests. Production
does not iterate to a fixpoint; union members are sorted after child
normalization.

The branch does not contain the addendum's explicit complexity-envelope test or
record a bound that accounts for union sorting. Before merge, state the bound
honestly (structural traversal plus per-union sort cost) and add a growth canary
that would reject accidental whole-tree fixpoint iteration.

### 15. Scheme-bridge shape, name, and writer

**Status: resolved branch-only.**

The owned-encoding branch defines `flb.scheme-bridge.v0` as
`{kind, from:{digest,scheme}, to:{digest,scheme}}`, walls it in both runtimes,
and appends it immediately after the new owned catalog fact. Retry appends a
missing bridge without rewriting the committed fact. The decision and writer
are recorded in that branch's `proto/DECISIONS.md`; merge is still required.

### 16. Trusted-base statement home

**Status: partial; form and file set are decided, ledger text is still owed.**

[Issue #23](https://github.com/mepuka/foldlab/issues/23) ratified the executable-
assumption form. The owned-encoding branch's decision log scopes the admission
call graph and lists the local files plus imported canonical/journal assumptions.
Task 36 explicitly instructed the executor to report the `VERIFICATION.md`
draft rather than apply it, and the branch contains no trusted-base ledger
entry. The coordinator still owes that merge-time ledger edit.

### 17. Related work before a public artifact

**Status: still owed.**

There is no `RELATED-WORK.md`. Hazelnut/Hazelnut lineage now appears in
`NEXT.md`, ticket 003, and the design/research shelf, so the original “Hazel is
absent” wording is partly stale. The generic authenticated-data-structure work
identified by issue #35 is still absent; occurrences of “Miller” in the tree
refer to evaluation statistics, not that prior art. The publication guard has
not been met.

### 18. Regular-tree closure law

**Status: partial branch-only; mechanism exists, load-bearing boundary is not
recorded.**

The no-dead-ends branch implements a finite production graph, least productive
fixpoint, independent certifier check, and an impossible-production negative
control (`completion.go`, `completion_test.go`). That is the right canary for
the current closed grammar.

Its decision log does not say that the proof depends on staying inside the
regular-tree fragment, nor what must happen when a future grammar escapes it.
The counterexample dossier's boundary therefore remains a prose-only residual.

### 19. Effect-pin migration deadline and inventory

**Status: still owed.**

`proto/CONTEXT.md` records the standing law and the upstream twelve-month
removal window, but no foldlab deadline, owner, or inventory of legacy protocol
touchpoints exists. Task 29 addresses current output/resource defects, not the
pin migration map.

### 20. Nix emitter probe

**Status: still owed and deliberately horizon-class.**

The repository now contains substantial Nix prior-art discussion, but no Nix
emitter, flake, or one-term throwaway probe. No build should be inferred from
that research. The next authorized step remains the issue's bounded prototype:
one hand-written `flb.system.v0` term, one emitted flake, and a report of digest
fields the current model cannot fill.

## Decisions still owed

The following require operator/coordinator action rather than executor inference:

1. Persisted refusal sort versus grammar-pinned table/reference, resolving the
   task-30 branch/addendum contradiction.
2. One `flb.certification.v0` element encoding, including stable law identity.
3. The authoritative `catalog_head` provenance for a mid-lag certification.
4. A repository fixture-freezing protocol before ticket 026.
5. Durable adoption of the catalog-query Go-plus-wall seam.
6. Merge/fixture ownership for the three completed request-kind lanes.
7. Durable multi-author session policy plus principal on every move.
8. The fold-cache re-hosting disposition and its exact accepted non-claim.
9. A durable home for executor acceptance laws now trapped in `scratch/`.
10. The full MCP P1-P14 conformance harness/home/owner.
11. A merge-time trusted-base entry in `VERIFICATION.md`.
12. A related-work register before a public artifact.
13. The regular-tree boundary as a load-bearing law.
14. An Effect-pin migration deadline and touchpoint inventory.
15. Whether/when to authorize the horizon Nix probe.

## Branch repairs already forced by ratified or binding evidence

- Task 30 cannot simultaneously ship
  `TestRefusalSortDoesNotRideOnTheWire` and satisfy its persisted-sort addendum.
- Task 37 needs principal attribution on fill/unfill move records before merge.
- Task 37 still owes the public `compact` documentation sentence.
- Task 36 still owes an explicit normalize-cost growth canary.
- Task 36's trusted-base draft must be applied to `VERIFICATION.md` at merge.

No code is changed by this audit because every live canary belongs to an
unmerged owner branch. Moving those implementations into current main here
would cross lane ownership and conceal the merge conflicts this register is
meant to expose.

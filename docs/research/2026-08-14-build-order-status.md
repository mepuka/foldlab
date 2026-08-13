# Build-order status: issue #22 integration register

2026-08-14 snapshot of the ratified build order in
[issue #22](https://github.com/mepuka/foldlab/issues/22), audited against
`origin/main` at `72afae43d915c2a50ce9f0c79b7f852c80c8c2e0`,
[NEXT.md](../../NEXT.md), the
[estate structures map](../design/2026-08-14-estate-structures-map.md), the
full issue record, the decision-preparedness re-audit at branch commit
`14a968578031731531a36d3bdb6aac191ceec83d`, and the named local lane heads.

This is a status register, not a decision record. It does not make an
unratified choice, merge a candidate branch, or turn branch-only evidence into
a claim about main. A commit named below is an integration input until it is an
ancestor of `origin/main`.

## Status language

- **Merged** — the evidence commit is an ancestor of the audited main.
- **Clean candidate** — a task commit and clean task worktree exist, but main
  does not contain the commit. This says nothing about conflict-free
  integration.
- **Active repair** — a committed baseline exists, but the owning worktree is
  being reconciled against later binding evidence. The baseline is not the
  acceptance head.
- **Held** — findings-before-fixes, an explicit task hold, or an unratified
  decision forbids the next build step.
- **Ratified, unbuilt** — the build is licensed, but no candidate commit was
  found. It is not the same as an unresolved grill.

Worktree cleanliness is reported only to distinguish a stable candidate from
an active owner. It is transient coordination evidence; the durable evidence
is the next clean commit and report.

## The integration graph

There is one hard product-order edge in the short-term wave:

```text
Task 30: refusal sorts + complete duplicate refusals
    |
    +--> Task 32: flb.certification.v0
```

Task 32 remains held until Task 30 merges and Task 32's record identity and
catalog-head provenance are ratified. Task 37 may integrate before Task 32 only
with its already-ratified `compaction-blocked` behavior; actual session
compaction remains locked until Task 32 supplies the corpus seam and digest.

Two additional arrows are branch-history/integration facts, not newly invented
product dependencies:

```text
Task 36 candidate 3d25d2194 --> extract/rebase Task 41 delta 996db5a3e
Task 39 candidate 0cd48630d --> extract/rebase Task 42 delta 98de253b0
```

The Task 41 branch contains Task 36's first implementation commit plus unrelated
main-equivalent documentation commits. The Task 42 branch contains Task 39 plus
similar duplicate documentation history. Their final task commits are usable
deltas; their branch tips are not clean independent merge units.

Tasks 30, 34, 35, 36, 37, and 40 overlap parts of the proto integration surface.
No issue comment assigns their merge order. A coordinator must choose a
sequence, rebase each remaining delta after the prior merge, and rerun the
derived contract and both proto gates. That is integration work, not a new
architecture choice.

## Ratified build-order snapshot

| Build item | Status at this snapshot | Evidence | Next lawful transition |
| --- | --- | --- | --- |
| Review-team foundations | **Merged** | The KV combine/law work and the four dossier merges are on main. The fold-cache admission work and its declared `KNOWN GAP` for genuine-declaration re-hosting are also on main. | Preserve the re-hosting non-claim unless an operator disposition explicitly closes or accepts it. |
| Task 30 + issue #21 | **Clean candidate series; owner report pending** | `89292529a` classifies all nine refusal kinds and lists duplicate offenders in both runtimes. Follow-up `869984e9a` persists the sort on the wire, updates strict R4 decoding and the TS round trip, and regenerates only the changed concierge refusal vectors under Addendum 2's authorization. | Obtain the owner's final gate report, then integrate both commits before Task 32. This audit does not duplicate the owning lane's edits. |
| Task 32 — refusal persistence | **Held; no branch found** | Its spec says `DO NOT START`; Task 30 has not merged. The language-surface and counterexample-dossier record shapes still need one durable disposition, including stable law identity and the head actually resolved by the certifier. | Ratify the record and head provenance, merge Task 30, then dispatch Task 32 from the resulting main. |
| Tasks 33 + 28 resume | **Clean candidate** | `7969430a6` adds the completion-reachability procedure and negative control; `facc3ade7` adds the one-hole-kind uniformity tripwire. Both live on the clean `codex/no-dead-ends` tip. | Integrate the two commits together; retain the bounded-current-grammar non-claim. |
| Task 34 — catalog query fold | **Clean candidate with a decision dependency** | `29a62296b` adds `type.get`, `catalog.query`, the Go fold, TS declared-algebra twin, cache key, laws, and new `catalog-query.json` fixture. The Go-plus-wall seam is recorded only in the branch decision log; the task asked for a probe and report before durable adoption. | Ratify or reject that seam, then rebase through the chosen proto merge sequence. |
| Ticket 026 — scale gauntlet | **Held before build** | The ticket is open and no scale branch was found. `fixtures/stream-wall.json` and `go/cmd/streamfix/main.go` still name nonexistent `docs/primitives/MECH-attempts.md`; `wirefix` has the repository's only explicit force-and-reason overwrite guard. | Establish the fixture-freezing protocol, then build the frozen spec, verifier, corpora, and run record. |
| Task 26 — Rosetta/code surfaces | **Clean candidate** | `codex/rosetta-code` ends at `68397c949`; its series repairs stale paths and vocabulary, records package laws, adds an entry map, renames the typed KV combine, and dogfoods replay in an executable example. | Rebase the series onto current main and rerun its example/typecheck evidence. |
| Task 27 — one-clock watch test | **Clean candidate** | `54a15aedf` changes only `go/effector/watch_test.go` and bounds the wait to the test context. | Integrate independently. |
| Task 29 — MCP output envelope | **Clean candidate** | `7a1b75e93` advertises object-typed output envelopes and ships its negative control. It changes only `proto/DECISIONS.md`, `proto/ts/src/mcp.ts`, and `proto/ts/test/mcp.test.ts`. | Integrate independently of the daemon request-kind sequence; preserve the separate held MCP input-validation finding. |
| Task 35 — frame-schema drift | **Clean candidate; proto contract overlap** | `6bad4f2de` keeps frame schemas open per contract and adds Go/TS conformance tests. It edits `contract.go` but no fixture. | Rebase in the coordinator-selected proto order. |
| Task 36 — owned canonical encoding | **Clean candidate** | `e7aac7c71` implements named normalize, `flb.type.v1`, recursion refusal, scheme bridges, and `certify`; follow-up `3d25d2194` supplies the previously missing cost-growth canary. Existing fixture directories are unchanged except Task 36's authorized new v1/bridge fixtures. | Rebase/integrate the two commits together and apply the reported trusted-base statement to `VERIFICATION.md` at merge. Then activate the 004-gated consumers. |
| Task 37 — session journal | **Clean candidate series; owner report pending** | `068f51616` is the initial `flb.session.v0` implementation and authorized session fixture. Follow-up `d0879d246` carries the owner through every mutator/event and refuses missing or mismatched principals before append, revising only the authorized session fixture. | Obtain the owner's final gate report. Integrate with `compaction-blocked`; unlock actual compaction only after Task 32. |
| Task 19 — NATS hardening | **Candidate commit; runner re-kicked** | `3c4e62847` preserves the batch-get finding; `81fb033b1` implements the ratified durability/read envelope. The clean worktree has an active runner rather than a final integration report in this snapshot. | Obtain the runner's final status and gate report before merge. |

## Later correctness candidates already in the fleet

These were dispatched after issue #22's original list. They are branch-only and
must not be read as shipped main behavior.

| Task | Status | Integration fact |
| --- | --- | --- |
| 38 — fresh empty KV | Clean candidate `7276bb5ba` | Independent core fix; returns fresh identity state per consumer. |
| 39 — ASCII upper + wasm wall | Clean candidate `0cd48630d` | Carries the CI wasm-build gate and is the history base of Task 42's branch. |
| 40 — constrained protod decode | Clean candidate `3cbde583f` | Edits `dispatch.go`; belongs in the proto rebase sequence. |
| 41 — deterministic pure walk | Candidate delta `996db5a3e` | Apply after Task 36; do not merge its ancestry wholesale. |
| 42 — stream twin boundaries | Candidate delta `98de253b0` | Apply after Task 39; do not merge its ancestry wholesale. |
| Harness integrity / issues #32 and #34 | Clean candidate `7eebccd0f` | Cross-cutting gate and journal-read repair; integrate as a reviewed delta because it touches root CI and journal behavior. |

## Held findings and triggers

### Refusal corpus and session compaction

Task 32 is the immediate held build. The remaining choices are not editorial:

1. one canonical `flb.certification.v0` element encoding;
2. stable law identity that is not mutable prose;
3. the catalog head the certifier actually resolved against, daemon-recorded
   rather than caller-asserted.

The Task 30 persisted-sort correction supplies the first prerequisite but does
not decide the other two. Session compaction remains a typed refusal until the
resulting corpus seam exists, as ratified in
[issue #24](https://github.com/mepuka/foldlab/issues/24).

### JournalMessageStorage

Ticket 020 phase 1 remains parked on `FINDING-WRIT-001`: the pinned Effect
`MessageStorage` contract's transaction boundary exceeds the three-verb writ.
The finding commit is already on main, but it is evidence, not an
implementation. Ticket 012's journal model is the named gate that can unpark
the transactional-writ question.

### MCP input validation

Branch `58f9678b6` preserves the opt-in public-seam witness that the pinned
`Tool.dynamic` / `Schema.Unknown` path does not supply the requested validation
authority. It intentionally adds no second validator. Task 29's output-envelope
repair does not resolve this finding.

### Verification triggers

- The R3 upgrade remains held until the Gen(3) verdicts and HARDENER guards
  land; issue #9 follows that trigger.
- Ticket 012 remains ratified build work with no candidate branch found. It
  unlocks tickets 017 and the split-CAS R4 obligation in addition to the parked
  transaction question.
- Ticket 026 is licensed build work but remains blocked by the fixture protocol,
  not by the missing Go twin incorrectly attributed to it in older summaries.

## Ratified or specified work not yet on main

- Ticket 004's decisions are resolved; Task 36 is their branch-only
  implementation. Until it merges, `flb.type.v1` is not a main claim.
- Tickets 015 and 016 are specified build work gated by the owned encoding.
  Ticket 005 additionally waits on ticket 008; ticket 008 remains an open grill,
  so neither is described here as ready.
- Ticket 012 is specified build work and has no candidate branch in this audit.
- Task 32 is specified but explicitly held as described above.
- Ticket 026 is specified but held on the fixture-freezing protocol.

## Exact corrections to stale status claims

1. Issue #22 and NEXT still say several lanes are merely dispatchable. Clean
   branch commits now exist for Tasks 26, 27, 28/33, 29, 30, 34, 35, 36, 37,
   and the later Tasks 38-42. None is merged into the audited main.
2. The earlier decision-preparedness report grouped Tasks 29, 34, and 37 as
   co-editors of `dispatch.go`, `CONTRACT.md`, and wire fixtures. Commit
   `7a1b75e93` proves Task 29 is not in that collision: it edits only the TS MCP
   implementation, its test, and the decision log. Tasks 34 and 37 do collide;
   Tasks 30, 35, 36, and 40 add adjacent proto integration overlap.
3. The fixture-freezing defect is stated narrowly here: the stream fixture and
   its generator cite a missing protocol path, while `wirefix` has a local
   overwrite guard. This audit does not repeat the unsupported blanket claim
   that a particular count of all repository fixtures lacks a regeneration
   path.
4. The earlier report called Task 36's cost canary missing. Follow-up
   `3d25d2194` closes that exact branch gap with an independently counted
   nested-structure/union envelope and an identity-preserving extra-pass
   control.
5. The estate map remains a useful demand inventory. Its `MISSING` labels are
   still correct for audited main even where this register names a branch-only
   candidate; changing the map to `SHIPPED` before merge would create a new
   status error.

## Decisions still owed

This register deliberately leaves the following with the operator/coordinator:

- Task 32's record encoding, stable law identity, and resolved-head provenance.
- Durable adoption or rejection of Task 34's Go-plus-wall query seam.
- The proto integration order and fixture owner for the overlapping candidates.
- The fold-cache genuine-declaration re-hosting disposition or explicit
  permanent non-claim.
- A repository-wide fixture-freezing protocol before ticket 026.
- The full MCP conformance harness/home and the MCP input-validation finding.
- The merge-time Task 36 trusted-base ledger entry.
- The regular-tree boundary as a load-bearing law for completion reachability.
- An Effect-pin migration deadline and inventory.
- A related-work register before any public artifact, and any authorization for
  the horizon Nix emitter probe.

No source, fixture, coordinator-owned spec, or Task 30-owned file is changed by
this audit.

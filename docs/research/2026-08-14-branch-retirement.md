# Branch retirement: the orphaned lanes are purged, not suspended

2026-08-14, operator-decided. Every branch other than `main` — 25 local,
11 remote — is retired. Each tip survives as an annotated `archive/<branch>`
tag pushed to origin; the branch refs are deleted everywhere. The estate now
tells one story: `main` as of `476d89fa2` (post seven-agent adversarial
review, tasks 46/47 merged) is the whole repository.

## Why

The candidate fleet (tasks 26–42 and the agent worktrees) accumulated a
generation of unmerged, un-reviewed work with overlapping proto edits, no
ratified merge order, and status prose that had already drifted from main
badly enough that the build-order register existed to correct it. The
operator's standing pattern applies: un-grilled machinery is purged, never
suspended. Work that was real re-enters through a fresh grill and a fresh
spec against current main; an archive tag is reference evidence for that
future spec, never a merge source.

## What retirement does NOT erase

- **The defects.** The adversarial review's open backlog
  (architecture audit §7) describes `main`, not the branches, and remains
  the honest debt list: `journal.AppendEntry` client-supplied `prev` (#1),
  unbounded claims map (#2), non-strict ingress (#3), lost-CAS dropped
  replies (#4), the repeated head-read shape (#5), the grammar-kind wall
  gap (#6), the two disclosed red findings (#7). Retiring a branch that
  would have fixed one changes nothing about the defect's status.
- **The ratified decisions.** Ticket 004's identity resolution, the
  workflow authoring/emission design, the effect-bridge grill record, and
  every ADR are decisions, not code; they survive on main. Only their
  un-reviewed implementations died.
- **The proofs.** verify/ir, verify/pipeline, verify/replay,
  verify/catalog, verify/implication are on main and untouched.

## What retirement DOES erase

Every claim of the form "a candidate exists for X." The build-order status
register (2026-08-14-build-order-status.md) is now a historical document:
its Merged rows remain true; every Clean-candidate / Active-repair row now
reads Retired. NEXT.md's short-term dispatch list is superseded until the
operator re-ratifies a build order from the post-retirement grill.

## The archive manifest

Recover any tip with `git checkout archive/<branch>`. All tips dated
2026-08-13 (one generation pre-review).

| Archived ref | Tip | Subject |
| --- | --- | --- |
| archive/claude/laughing-kalam-9c83ba | 2307333a9 | Entity-quotient correction carried to four surfaces |
| archive/codex/anti-tunnel-integrity | 235fa29f9 | Close anti-tunnel integrity gaps (#33) |
| archive/codex/ascii-upper-wall | 0cd48630d | Pin uppercase transforms to ASCII bytes |
| archive/codex/catalog-bound-guards | 8a97d9f1b | Reject truncated catalog bounds |
| archive/codex/catalog-query-fold | 29a62296b | Catalog query fold (task 34) |
| archive/codex/constrained-protod-decode | 3cbde583f | Constrain protod request decoding (task 40) |
| archive/codex/decision-preparedness | 14a968578 | Decision-preparedness re-audit |
| archive/codex/frame-schema-drift | 6bad4f2de | Frame schemas open per contract (task 35) |
| archive/codex/fresh-empty-kv | 7276bb5ba | Fresh KV identity per consumer (task 38) |
| archive/codex/gauntlet-verifier-integrity | f36413003 | Strengthen gauntlet verifier integrity |
| archive/codex/harness-integrity | 7eebccd0f | Harness integrity + correctness gates (#32/#34) |
| archive/codex/ledger-doc-integrity | 379556502 | Repair ledger and documentation integrity (#28) |
| archive/codex/proof-literature-audit | a3379bcd9 | Merged proof delta audit |
| archive/codex/protod-pure-deterministic-walk | 996db5a3e | Structure refusal blame by identity (task 41) |
| archive/codex/read-tail-verification | 5b98d00fb | Verify read cursors at the tail |
| archive/codex/refusal-session-integration | b40fbf6e5 | Session compaction gate doc |
| archive/codex/rosetta-code | 68397c949 | Rosetta examples, parallel KV replay (task 26) |
| archive/codex/stream-twin-boundaries | 98de253b0 | Close stream twin boundaries (task 42) |
| archive/codex/unicode-drift-classifier | 26f58de33 | Always-built Unicode drift classifier |
| archive/codex/watch-one-clock | 54a15aedf | Bound watch waits to their context (task 27) |
| archive/codex/watch-recoverable-chatter | 1b48c7c80 | Recover watch chatter from authority |
| archive/codex/wave2-hazards | 2b77c67cf | Wave-two dispatch hazards |
| archive/docs/first-contact | b2f25ec08 | Tutorial register, why-essay, doorway |
| archive/media/posters | 397b5298d | Five static posters |
| archive/media/posters-v2 | 57b202029 | Four sibling posters |
| archive/examples/rosetta-demo | 9a21576f9 | Rosetta demo |
| archive/lean/ssex-core | ec553ceaf | SSEx core Lean lemmas |
| archive/worktree-agent-a3e32414bd8698150 | 71e25589c | Correctness gating / freezing protocol |
| archive/worktree-agent-a7077fe80ecb149d8 | 9726f51ea | Type population from data |
| archive/worktree-agent-a7edde195d038ec46 | 6b25ae613 | DX journey, fourteen user stories |
| archive/worktree-agent-a7f24e013a37910af | 75b1acfdc | Systems as declared data |
| archive/worktree-agent-aa1734538d7359e7f | 5f82cd43f | Capstone deep-module map |
| archive/worktree-agent-aab5cd958c3b708c4 | 5ffd1316a | Federated fold cache as Effect services |
| archive/worktree-agent-aaf7f65ab3380d246 | dca06c265 | Bug-breaker final verdict |
| archive/worktree-agent-ac12a6acee3504305 | 5227f511b | MCP concierge dogfood |
| archive/worktree-agent-acffb764559941aba | ea12a33c6 | Codegen services scoped |

Several task branches the build-order register named were already
refless at retirement time (their branches deleted or never local), with
tips dangling in the object database. Each was tagged directly so the
archive is complete:

| Archived ref | Tip | Subject |
| --- | --- | --- |
| archive/task-30-refusal-sorts | 869984e9a | Refusal sorts classified + persisted on the wire |
| archive/task-33-no-dead-ends | facc3ade7 | Completion reachability + C4 uniformity tripwire |
| archive/task-36-owned-encoding | 3d25d2194 | Owned canonical encoding + cost-growth canary |
| archive/task-37-session-journal | d0879d246 | flb.session.v0 + principal ownership repair |
| archive/task-19-nats-hardening | 81fb033b1 | Durability/read envelope hardening |
| archive/task-29-mcp-envelope | 7a1b75e93 | MCP object-typed output envelopes |
| archive/mcp-input-validation-finding | 58f9678b6 | Opt-in public-seam validation witness |

All hold the same status as the branch archives: reference evidence for a
future spec, never merge sources.

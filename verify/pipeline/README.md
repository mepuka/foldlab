# verify/pipeline — the create pipeline and the snapshot law (TLA+)

Increment 2 of the ground-truth program
([architecture audit](../../docs/research/2026-08-14-architecture-audit.md)
§5). Models `type.create`'s two-entry commit (fact + scheme bridge, under
the catalog mutex) and the reply's `(seq, head)` pairing. Gate: `./run.sh`.

## The law and the verdicts

**The snapshot law** (pre-registered by the audit as its
safety-by-construction candidate): *every reply that names a head names
the head its facts were read under* — for a create reply: `seq` addresses
this op's fact, `head = seq + 1`, and `head` addresses this op's bridge.

| config | verdict (recorded) |
| --- | --- |
| `Pipeline.cfg` (snapshot rule) | clean — TypeOK, SeqHeadCoherent, RepliedImpliesBridged, crashes enabled |
| `Pipeline.shipped.cfg` | **refuted on SeqHeadCoherent** — models the pre-fix head read outside the lock (dispatch.go:109); a **regression guard**, since the defect is fixed and merged (`3aebd2ba9`); trace committed |
| `Pipeline.orphan.cfg` | **refuted on NoOrphanFact** (quiescence-guarded) — a *terminal* `crashed` op leaves a durable fact with no bridge. Review fix: the invariant is guarded on `phase ∈ {replied,crashed}` so it no longer fires on the benign in-lock transient; a mutation test confirms deleting `CrashInLock` makes this control pass, proving the crash action is its sole cause. Caveat: shipped protod repairs the missing bridge on retry, so the model is stricter than the code. |
| `Pipeline.shipped-bridged.cfg` | clean — even the shipped rule never replies unbridged; the defect was head provenance only |

The repaired rule is the `frontierSnapshot` pattern (catalog.go:111-126)
applied to `serveCreate`: capture the reply inside the critical section.
This spec is the ratification artifact for Task 32's `catalog_head`
provenance requirement.

## Abstractions, stated

A head is a journal position (entries unique ⇒ head equality is prefix
equality); certification always succeeds and convergence/duplicate create
is out of scope at these bounds; the catalog mutex is a lock giving mutual
exclusion but not crash-atomicity (exactly the shipped semantics); two
concurrent creates.

## Run record

TLC 2026.08.11.125311 (rev 0894c34), `tla2tools.jar` sha256
`ab323b79802aedc3203b3f9af37c6aca3ed43f4e0225b36f2aa77b26de46c05f`
(rolling v1.8.0 asset, pinned by recording — see verify/catalog/run.sh),
OpenJDK Temurin 21.0.2 via `mise x java@21`, 1 worker, Windows 11. Clean
run: 43 states generated / 28 distinct, depth 7, < 1 s. Recorded
2026-08-14, this session.

## Next rungs (roadmap, audit §5)

The journal gate (ticket 012, JL0–JL7); replay soundness composed over
the proven effector spec (before tickets 008/020 build); effector clock
honesty (skew assumption ledgered or discharged).

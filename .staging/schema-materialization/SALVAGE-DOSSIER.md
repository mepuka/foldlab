# Salvage dossier — the pre-re-init estate

2026-08-29. 29 distinct tips audited (37 branch refs, all pre-08-24
re-init, none mergeable). Ten maximal tips preserve every byte;
`346b2963` alone contains 19 others as ancestors. All salvage is now
attic-tagged (`git tag -l 'attic/*'`, 17 tags); every old-era branch
ref is deleted. Read documents via `git show attic/<tag>:<path>`.

## Ranked GRILL-AND-FOLD (operator grilling queue)

1. **MCP surface deep-read** — attic/mcp-surface-deep-read
   `:docs/design/2026-08-14-mcp-surface-deep-read.md` → MCP host.
   Load-bearing residue in (b) below.
2. **Plait model-emitter flip + DECISIONS.md** (7875-line decision
   register, each entry with a "Load-bearing? yes/no" verdict) —
   attic/archive-tip-plait-decisions → Materialize + the ruling
   queue's direct ancestor form.
3. **Correctness gating + LAWS.md + check-laws.ts** —
   attic/correctness-gating-laws → the law-ID-to-test index the
   current tree lacks ("rewrite the comment and the law is gone,
   silently, with every gate still green").
4. **Ticket 004 D1-D5 identity rulings** —
   attic/ticket-004-identity-rulings → D2's "every normalize change
   is a new scheme" is unrestated in the current queue.
5. **Federated fold cache** (+ green packages/cache) —
   attic/federated-fold-cache → backend/sync: cache key =
   (fold digest, chain head) ⇒ join-semilattice federation, no
   invalidation, collisions are corruption proofs.
6. **Type population from data** — attic/type-population-from-data →
   deriving: inference computes a LOWER bound, dialogue supplies the
   upper, the certifier admits (Gold-honest).
7. **Counterexample-algebra dossier** — attic/counterexample-algebra
   → proof discipline: the estate's cleanest operator-conjecture
   refutation.
8. **DX journey, fourteen executed user stories** —
   attic/dx-journey-learning-by-refutation → workbench UX; the hole
   found: create-before-publish forces hand-writing a type.
9. **MCP concierge dogfood session** (2028-line verbatim transcript)
   — attic/mcp-concierge-session → the dogfood baseline the current
   manifest lacks.
10. **Systems as declared data** — attic/systems-as-declared-data →
    the composition spec: "Effect code is data" is true of the
    WIRING and false of the WORK; a Layer graph is a canonical
    value, its leaves are catalog digests.
11. **The language surface** — attic/language-surface-folding-media
    → the prose pillar's sharpest statement (utterance = evidence;
    the meaning edge = a decision, single-homed).
12. **Unified fold + capstone deep modules** —
    attic/expressive-power-unified-fold, attic/unified-fold-capstone
    → the store-language spine's intellectual ancestor.
13. **Learning by refutation** (+ its supersede-in-place discipline:
    "a finding fixed and still cited is a claim sized wrong").
14. **Unity-bridge angles 1+5** — attic/unity-bridge-08-18-vein →
    F3 bridge: unity is INSTANTIATION; refuse the seam rather than
    manufacture a simulation relation.
15-23. Concierge catalog · refutation-record chain (the WEAKENED
    verdict tier + withdraw-the-claim-keep-the-record) · columnar-UI
    spike (views as citable facts) · codegen promotion frame ·
    README Effect positioning (publishable nearly as-is) ·
    BUG-BREAKER method ("proof leaks at the parallel encoder") ·
    CAS motion/door growth · algebra-engine stance ("hold the system
    to the model") · folding media (renderers that refuse to draw a
    law they fail).

## (b) Load-bearing now

- The current MCP manifest targets NO protocol revision (safe by
  construction). The vendored rc.111 pin ships three adapters, none
  for the 2026-07-28 stateless revision — consistent with the
  operator's ruling that stateless = simpler and ours to generate.
- **A9 bites the estate specifically**: the pin emits `outputSchema`
  only when the JSON Schema's type === "object", so a tagged-union
  result (exactly the refusal envelope shape) silently advertises NO
  outputSchema while structuredContent still carries the value. Test
  against rc.111 before the host lane wires result schemas.
- The LAWS.md gap applies verbatim today: the ruling queue records
  rulings but binds none to enforcing tests.

## Disposition executed

17 attic tags; 38 branch refs deleted (34 + 4 that still held
old-era worktrees, also removed). Five tips carried nothing and are
preserved only via the archive tip's ancestry.

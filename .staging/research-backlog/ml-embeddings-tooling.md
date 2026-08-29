# Research backlog — lightweight ML/embeddings tooling for the acquisition loop

Charter (operator-directed 2026-08-28, side project, exploration-grade):
investigate lightweight ML and embedding tools that could boost the
ingestion/annotation machinery — data collection and tagging across ALL
repo usage. Candidate work items, each needing its own pinned survey
before anything is admitted:

1. **Embedding-assisted recognition triage** — embed Effect code
   fragments repo-wide; cluster by register (gen-body, pipe-chain,
   point-free, service-wiring); use clusters to PRIORITIZE which
   recognition-manifest rules to write next and to find wild forms the
   whitelist misses. Evidence-preparation only (like liteparse) — never
   admission.
2. **Verbal-register pairing data** — the deterministic verbal register
   (.staging/verbal-register/) gives (code, verbal) pairs; embeddings
   measure whether the register is actually SEPARABLE (distinct
   constructs land far apart, one construct's variants land together) —
   a quantitative check on determinism before the printer-model lane
   (EFFECTS-BACKEND R13) trains anything.
3. **Repo-usage tagging** — lightweight classifier/embedding pass
   tagging every declaration/test/fixture with area + carrier labels,
   cross-checked against the surface ledger's PRECISE census
   (surface/cas-surface.json is ground truth; ML output is evidence,
   never identity — the direction law applies to models exactly as to
   parsers).
4. **Tooling survey** — small local models and embedding stacks (bun/
   node-friendly, no service dependency) suitable for the estate's
   trust posture; each tool needs a TOOLS.md admission row before its
   output touches gated work.

Standing constraints: the acquisition loop (R15) governs — model output
is evidence; ingestion through admitted instruments; canonical
re-emission; gates; admit. Nothing here mints identity.

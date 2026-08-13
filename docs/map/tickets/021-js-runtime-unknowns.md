---
id: 021
title: JS runtime unknowns — Bun, Node, and the engines under Effect
type: wayfinder:research
status: open
assignee:
blocked-by: []
---

## Method

Pre-registered before the research pass (the ticket-018 discipline):
Effect is a runtime on a runtime — Bun (JavaScriptCore) in our gates,
Node (V8) for most users — and our identity code stands on both.
Items scored CONFIRMED / REFUTED / PARTIAL / UNANSWERED by a scout
against primary sources; novel hazards measure the misses.

## Register 1 — engines and the spec

1. **The engine split under identity.** Every TS≡Go wall runs on Bun
   only, so the real claim is TS-on-JSC ≡ Go. RFC 8785 number
   serialization IS ECMAScript's number-to-string; the spec pins the
   algorithm exactly, but engines have historically had edge bugs.
   If JSC and V8 differ anywhere on our sharp corpus, identity forks
   BETWEEN USER RUNTIMES and no current wall sees it. Benign if: a
   three-way lane (JSC ≡ V8 ≡ Go) over the full sharp corpus goes
   green. My top fear.
2. **The transpiler in the identity path.** Bun transpiles TS at run
   time — an unaudited compiler between our source and the engine.
   String literals, escapes, numeric literals through it must be
   byte-faithful. Benign if: literal fidelity is spec-guaranteed and
   the Bun version is pinned like every other law (is it? CI pins
   1.3.14; local drift unpinned).
3. **UTF-16 code-unit operations** (identity order, surrogate
   handling in sort/compare) — spec-stable in principle; verify no
   engine/ICU involvement anywhere in our comparators.
4. **JSON.parse residual usage**: we hand-roll the constrained
   decoder, but any remaining JSON.parse in identity-adjacent paths
   inherits engine parsing behavior.

## Register 2 — runtime APIs and portability

5. **CONFIRMED IN ADVANCE: packages/core is Bun-only** —
   schema.ts uses Bun.gunzipSync/gzipSync. Unrunnable on Node. The
   fix is node:zlib (both runtimes implement it); the general rule to
   ratify: library packages use only Node-API surface that Bun
   implements, never Bun globals; Bun-only is permitted in tests and
   scripts. Enumerate all other Bun-isms (bun:test aside).
6. **SHA-256 provenance per runtime**: which implementation backs our
   digests on Bun vs Node (BoringSSL? node:crypto? webcrypto?) —
   deterministic output regardless, but API availability and
   performance differ; pick the portable one.
7. **@nats-io/transport-node on Bun**: node:net compat is
   reimplemented by Bun; our suites pass, but backpressure, partial
   writes, and error surfacing under load are unverified on the
   non-native runtime. Which runtimes do we CLAIM the client supports?
8. **Process/child semantics**: harness spawning (protod), signal
   delivery, stdio buffering, Windows kill semantics — Bun vs Node
   differences in child_process compat.
9. **Timers and scheduling**: micro/macrotask ordering differences
   between engines as a test-flakiness and Effect-scheduler concern
   (Effect abstracts it — verify the abstraction's floor).

## Register 3 — ours

10. **Gate monoculture**: no Node lane anywhere in CI; the runtime
    users run is the runtime we never test. Minimum fix: a Node
    runner executing the identity corpus (JCS sharp classes + frozen
    fixtures) under V8, byte-compared — the three-way wall.
11. **Bun as an unpinned law locally**: CI pins bun 1.3.14; local
    dev and the transpiler float with whatever is installed.
    Pins-are-law arguably applies to the runtime itself.
12. **bun:test as the only test harness**: library law suites
    (fold algebra, JCS) should be runnable under a portable runner so
    users can run OUR laws in THEIR runtime — the wall factory as a
    portability statement.

## Deliverable

Scout dossier scoring all items against primary sources (ECMA-262
number-to-string + Abstract Operations; Bun docs/Node-compat tables +
source where needed; Node docs; engine conformance suites), novel
hazards ranked, then the coordinator's determination: portability
rule ratification, the three-way identity lane, CI matrix scope, and
what VERIFICATION.md must state about runtime scope per claim.

## Pre-registered through-line candidate (coordinator, before the scout returns)

Spec-determinism as law: identity-bearing modules restricted to
spec-total operations (ECMA-262 leaves them zero latitude) are
cross-engine-equal by theorem of the spec, not by testing. If the
scout's spec citations hold, the determination should ratify: (1) a
spec-total allowlist for identity modules, mechanically gated; (2)
ADR-0001 generalized from cross-language to cross-EVALUATOR (every
engine is an adapter under one wall factory); (3) engine walls demoted
to negative controls on the engines — they exist to catch an engine
violating its own spec. Runtime-dependence localizes in the effects/
services layer by construction (ticket 020's Layers), each service
contract owing its conformance law. Scored like everything else: if
the spec turns out to leave latitude anywhere we assumed totality,
that is a finding against this candidate and the wall stays
load-bearing.

## Resolution (2026-08-13)

Scored — full record:
[docs/research/2026-08-13-js-runtime-scorecard.md](../../research/2026-08-13-js-runtime-scorecard.md).
Nine of twelve confirmed/partial. Through-line: strong form REFUTED
(ECMA-262 Note 2 is non-normative; RoundMVResult is
implementation-defined — the falsifiability clause fired as designed);
weak form ratified — spec-total where total, cited-latitude walls
where not, engine walls load-bearing BECAUSE the note is optional.
Execution: scratch/codex/21 (jcs Node fix, -0 drift alignment,
node:zlib runnability, three-way lane, pins, grep gate, ledger
scope statements). Deferred with options recorded: NATS transport
backpressure posture; Windows CI runner.

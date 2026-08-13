# JS runtime scorecard — ticket 021's priors and through-line, graded

Provenance: Opus scout, 2026-08-13, primary sources (ECMA-262, RFC
8785, test262, Bun/Node docs, engine bug archaeology) plus ~4.4M-value
empirical sweeps run on the exact pins (bun 1.3.14/JSC, node
v22.23.2/V8, go 1.26.5, Windows). Nine of twelve ledger items
CONFIRMED/PARTIAL; the pre-registered through-line refuted in strong
form by its own falsifiability clause.

## The spec verdict (item 1 + novel 1 — the load-bearing findings)

- ECMA-262 6.1.6.1.20 step 5 does NOT uniquely determine
  number-to-string: least significant digit non-unique; the
  closest/even tie-break is NON-NORMATIVE Note 2; Number.MIN_VALUE
  has five legal spellings; RFC 8785 §3.2.2.3 promotes Note 2 to
  MUST. Identity rests on a note the standard calls optional.
- Decode twin (ledger MISSED it): 7.1.4.1.3 RoundMVResult is
  "implementation-defined" past 20 significant digits; jcs.ts calls
  Number() on unbounded literals; a constructed 55-digit literal
  legally admits a full-ulp divergence (all three implementations
  decline it — empirically clean, legally exposed, unwalled).
- The shared-dtoa safety argument EXPIRED: V8 now Dragonbox, JSC
  still Grisu3 — independent implementations; every engine bump is a
  re-verification event.
- test262 does not certify the property (four assertions total);
  RFC 8785's own Appendix B prescribes differential testing as the
  method. Our wall IS the industry-correct instrument.
- Empirics: bit patterns, decimal round-trips, 21–96-digit
  mantissas, ulp walks at every boundary, sharp corpus, Appendix B,
  golden fixtures — byte-identical digests on JSC and V8 throughout.

## Through-line verdict (pre-registered, scored)

STRONG FORM REFUTED — spec-determinism cannot be law for numbers;
the falsifiability clause fired as designed. Weak form SURVIVES:
UTF-16 code-unit operations are fully determined (item 3 REFUTED
cleanly — no ICU/locale anywhere in our comparators); the ratified
law becomes: spec-total operations where the spec is total; walls
with cited latitude clauses where it is not — and the engine wall is
load-bearing BECAUSE Note 2 is non-normative. VERIFICATION.md states
runtime scope per claim: "on the pinned JSC and V8 builds, over the
recorded corpus."

## Confirmed bugs and gaps

- packages/core/src/jcs.ts cannot run under Node (parameter
  properties vs type stripping) — six-line hoist; then
  erasableSyntaxOnly in tsconfig enforces forever.
- INTRA-REPO domain split: proto/ts/src/jcs.ts throws on -0 while
  core emits "0" per the task-09 ratified repair — proto drifted from
  a ratified disposition; alignment is mechanical, not a new
  decision. Only the core canonicalizer is walled against Go.
- Bun-isms in library source: exactly two (schema.ts gzip calls) →
  node:zlib (RUNNABILITY only: gzip bytes differ per runtime/OS and
  Node guarantees nothing — ADR-0002 already keeps gzip out of
  identity; never freeze a TS-produced gzip fixture). Grep gate
  needed: @types/bun types the Bun global everywhere, so a new
  Bun.* in src passes typecheck silently.
- Bun.Transpiler.transformSync replaces lone surrogates with U+FFFD
  (measured on the pin) — unused today; never route identity source
  through it. bun run/build literal fidelity measured byte-identical
  to node on 19 sharp classes; open bun bug #37161 noted.
- @nats-io/transport-node: Bun support is a docs-only claim (no
  upstream Bun CI); _send() discards socket.write backpressure and
  swallows write errors BY DESIGN — degradation under load is heap
  growth, not error. Options recorded (upstream issue; wsconnect
  websocket path is node:*-free; accept+monitor) — disposition
  deferred to client hardening.
- CI monoculture confirmed: no Node lane, no Windows runner (dev is
  Windows; child-process kill semantics are unconditionally forceful
  there). ESM nextTick ordering diverges bun-vs-node (low exposure;
  no nextTick in our source). node:crypto everywhere already —
  correct, keep (BoringSSL vs OpenSSL, same FIPS function). JSON.parse
  residuals: two identity-adjacent sites inherit the same
  RoundMVResult latitude.
- Pins: bun unpinned locally (no .bun-version; engines unenforced by
  bun — open issue #5846); node unpinned everywhere. bun:test is a
  one-way door (22 files); the portable identity-runner doubles as
  the users-run-our-laws surface.

## The three-way lane (designed; nearly free)

Step 0: the six-line jcs.ts fix + erasableSyntaxOnly. Lane A:
parameterize the Go differential's probe command (env var, default
bun) and re-run go test with node — the whole fuzz corpus + shrinker
crosses V8↔Go with no new tests. Lane B: one standalone
scripts/identity-runner.ts (no bun:test) replaying sharp corpus +
Appendix B + golden fixtures, run under both interpreters, outputs
diffed. Same single CI job (half-run risk); pins via .bun-version +
.node-version files. Certifies: byte-identical TS output on both
pinned engines over the recorded corpus, matching Go. Cannot certify:
all doubles, other engines/versions/platforms, or a spec guarantee
that does not exist.

Execution: scratch/codex/21-runtime-portability.md.

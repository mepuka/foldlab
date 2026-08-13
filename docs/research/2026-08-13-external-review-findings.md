# External review findings — FROM OPERATOR

Date: 2026-08-13. An external consulting review of the whole estate:
proof mechanics (`verify/`), the Go substrate (`go/`), the tracer daemon
(`proto/`), and the TypeScript core (`packages/core`). Method: four
independent deep-read passes plus a first-hand review of the in-flight
catalog R4 work on `codex/catalog-r4`. Gate state at review time, on a
fresh macOS checkout of `main` (5784d6d): `bun test` 113 pass / 4 skip
(wasm, absent `dist/`), Go suite green across all packages under
Go 1.26.5 (`mise x go@1.26.5`; the default 1.25.6 toolchain refuses the
module and the JCS wall reports that refusal as a divergence rather than
skipping — the failure direction is correct).

Findings only; no fixes were applied. Each central claim carries an id
(C1–C8). An adversarial refutation pass — one independent read-only
reviewer per claim, instructed to refute — was launched with this
document; its verdicts will be recorded here when they land.

## Central claims

### Correctness

**C1 — collector poisoning (packages/core/src/entity.ts:63).**
`applySync` diverges from the walled `applyKV`
(packages/core/src/stream.ts:203): non-fatal UTF-8 decoding, NUL bytes
accepted in keys, `count` unbounded — all inputs `applyKV` refuses as
typed `MalformedPayload`. One ingested event whose payload contains a
NUL key (bytes of `k\0=v`) is stored; every later `anchors()` call
(entity.ts:106) throws `RangeError` from `stateDigest`
(stream.ts:249). The entity property tests filter exactly these inputs
(entity.test.ts:48), so they certify a pre-sanitized domain. The
package has two meaning-folds that disagree on the domain and only one
is walled.

**C2 — journal Open adopts an unverified tail (go/journal/journal.go:96–109).**
`Open` decodes the last message and takes `EntryDigest(decoded)` as the
append parent without checking `DigestHex(raw.Data)` against it —
the check `Read` performs at journal.go:193–196. A tampered or
non-canonical tail poisons the head all subsequent appends chain to.
A genesis-rooted reader still detects it later; the writer had the raw
bytes in hand and did not look.

**C3 — three-way ingress-frame disagreement.**
`proto/wire/CONTRACT.md` ratifies extra frame keys as admitted content
and `proto/go/protod/ingress.go` admits them; `contract.describe`
(proto/go/protod/contract.go:195–198) describes the frame as a closed
struct and `toJsonSchema` (proto/ts/src/codegen.ts:186) renders
`additionalProperties: false` — so the derived MCP publish tool forbids
frames the daemon accepts. By the contract's own rule, a disagreement
between it and the daemon is a bug in one of them.

### Claims outrunning their evidence

**C4 — R3 induction hypothesis under-covers IndInv (verify/catalog/CatalogInd.tla:54–57, 102–105).**
The hypothesis is generated with `catalog = Gen(2)` and `data = Gen(2)`
while `NumVals = 3` and `CatalogNaturallyBounded` permits catalog
length 3: a reachable IndInv state is unrepresentable in the hypothesis,
so consecution and action safety were checked over a strict subset of
IndInv. Separately, obligation 3 (`StateSafety` from `IndInit`) is a
tautology — its conjuncts are verbatim a subset of IndInv's — and
cannot fail. The proof likely survives re-running at `Gen(3)`; as run,
the claim exceeds what was checked. Related ledger fact: main carries
"R3 CLAIMED" (CatalogInd.tla:3, NEXT.md:92, ticket 009) beside
"R3 … not claimed" (VERIFICATION.md:57–58, CatalogInd.cfg:1); under the
ledger rule the claim is currently not made while three files say
otherwise.

**C5 — TestLinearizableReads certifies less than its name (go/substrate/assumptions_test.go:316–362).**
What is verified is read-your-own-acknowledged-write monotonicity on a
single-node `Replicas:1` in-process server. nats.go v1.53.1 sets
`AllowDirect: true` unconditionally and serves direct gets, which on
R>1 buckets may come from followers — the named property can fail in a
topology where this gate stays green. `protod.Acquire` refuses R>1 and
clustered configurations before startup, which scopes the envelope; the
test name and the assumption record still state more than the tested
topology. Related: the effector's shape gate (go/effector/effector.go:465)
does not refuse `Mirror`/`Sources` buckets, though the journal's does
(go/journal/journal.go:283).

**C7 — compaction's central law is exemplified, not quantified (packages/core/src/stream.ts:290–295).**
The comment claims "The two-fold law (tested)". No property test
quantifies it: stream.property.test.ts:336–343 checks boundary
rejection only; stream.wall.test.ts:72–78 pins one frozen example.
No test over arbitrary histories and cut points checks that
`headFrom(compacted.base, tail)` equals the uncompacted head and that
resuming the meaning fold from `compacted.state` equals folding the
whole history.

**C8 — refusal next-hints can dead-end (proto/go/protod/read.go:148–153).**
SPEC W7 promises filled body templates; the conformance harness asserts
hints non-empty but never executes them; the cited hint carries an
angle-bracket placeholder that the create path's hex check
(proto/go/protod/ingress.go:63–73) refuses if replayed verbatim. The
concierge's C4 law mechanizes no-dead-ends for the frontier; nothing
does so for refusal hints.

### Structure

**C6 — the fold tower has no consumer (packages/core).**
A workspace-wide import trace finds the only non-test consumers of
`@foldlab/core` are packages/server/src/server.ts and
bench/stream.bench.ts, both importing only `stream.ts`/`xform.ts`.
`algebra.ts`, `fold.ts`, `foldLaws.ts`, `foldCache.ts`,
`foldBindings.ts`, `foldArbitrary.ts`, `entity.ts`,
`streamBindings.ts`, `schema.ts`, and `jcs.ts` terminate in their own
tests. `foldCache.ts` is a cache with no reader — the structural
pattern the mint rollback (NEXT.md, 2026-08-12) deleted. ADR-0010 makes
the tower lawful; nothing yet makes it load-bearing.

## Secondary findings

- MCP derivation is drift-proof for tool input schemas only: reply
  shapes exist in CONTRACT.md, contract.go, and wire.ts with tests as
  the drift detector; the publish envelope (proto/ts/src/mcp.ts:45–56)
  is the one hand-authored schema, and C3 sits exactly there.
- Refusal `kind` is an open string in contract.go:60 and wire.ts:26;
  agents cannot machine-check exhaustiveness over the nine kinds.
- Fold-law generator domains are narrower than the declared semantics:
  `nullable-finite-number` generates integers in ±1000 (no −0, no 2^53
  boundary); `stringSet` gets no supplementary-plane stress
  (packages/core/src/algebra.ts:181–185, foldArbitrary.ts:29–32).
  Wire identity fixtures are thin: chains.json and frames.json carry
  two vectors each; nothing above the BMP.
- `DeclarationTypeId` uses `Symbol.for` (algebra.ts:95), a globally
  reachable key — a hand-rolled Declaration with an arbitrary digest
  can impersonate a declared algebra. A file-private `Symbol()` closes
  it.
- `encodeValue` (packages/core/src/jcs.ts:90–104) serializes any
  non-array object's enumerable keys; a prototype-carrying value
  smuggled past the type canonicalizes as `{}` or partial data instead
  of refusing.
- `schema.ts:77,90` calls `Bun.gzipSync`/`Bun.gunzipSync`, an
  undeclared runtime coupling in a package whose dependency law is
  `effect` only; node:zlib is already in-policy.
- Journal: a losing writer's cursor never resyncs after `ErrConflict`;
  the occupancy re-read failure at journal.go:238–241 returns a raw
  `APIError` that `errors.Is(err, ErrConflict)` misses; `Read` holds
  the mutex across N network round-trips.
- `canonical.EntryDigest` (go/canonical/canonical.go:223) substitutes
  U+FFFD for invalid UTF-8 instead of refusing; digest and wire stay
  mutually consistent, but an identity is minted for a value the
  canonical domain excludes.
- Catalog.tla: `AdmissionSeesResolution`/`AdmissionStep` and the
  monotonicity pair are stated twice (Catalog.tla:327–332,
  CatalogInd.tla:69–77) against the stated-once law; no `ASSUME` guards
  the `1..4` constant truncation (Catalog.tla:98–100); `ForgedMirror`
  keeps the length guard, so the length clause of
  `LagIsAbsenceNeverWrongData` has no refuting control; run.sh gates R2
  only — the six R3 obligations are manual; run.sh:63 uses `sha256sum`,
  absent on stock macOS.
- catalogr4 (branch `codex/catalog-r4`): the FINDING-001 → coarsened
  `CreateAtomic` refinement disposition was reviewed first-hand and the
  bridge argument is sound — same variables, factored transition
  functions pinned by a state-count canary (119,145 / 18,295 / 16),
  R2 invariants re-checked directly on `WireSpec`, and a required
  faithless control (`BrokenAtomicBridge`) refuted at depth 2.

## What holds

Verified during review, stated as fact: the effector's safety is
carried by server-side revision CAS on every mutation path, with stale
reads degrading to spurious `ErrHeld` or duplicate execution, never to
double commitment; the adversarial crash schedule fails if it does not
produce a duplicate execution. The journal's tamper detection on `Read`
is three-layered (position, chain linkage, byte-digest) and the server,
not the client, refuses conflicting raw publishes. `go/canonical`
refuses lone surrogates the stdlib launders, catches duplicate names
after unescaping, and sorts by true UTF-16 code-unit order; numbers are
covered by the Appendix B fixture, a live bidirectional differential
fuzz against the TS engine, and a deterministic PCG lane.
`TestTerminalImmutability` proves its refusal is the permission by
succeeding at the same deletion with admin credentials and then showing
exactly what breaks. The tracer's teaching is mechanically tested: the
smoke test repairs a typo by resubmitting the refusal's own example,
and the writ is enforced at the NATS permission layer. FINDING-001 was
stopped on red with a minimized counterexample after both control
classes passed and before any pass count existed.

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
reviewer per claim, instructed to refute — ran the same day; the
verdicts are recorded at the end of this document. Three claims
CONFIRMED (C1, C3, C4), four WEAKENED (C2, C5, C6, C7), one REFUTED
(C8). The claim texts below are kept as written; the verdicts section
carries what fell.

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

## Refutation verdicts (2026-08-13)

Eight independent read-only reviewers, one per claim, each instructed
to refute. Every verdict returned at high confidence. Corrections the
refuters made to this document's own claims are recorded verbatim
below; a claim that survived is not thereby strengthened beyond its
stated bounds.

**C1 — CONFIRMED.** Reproduced by execution against the real modules:
`applyKV` refuses a NUL key as `MalformedPayload`; `applySync` stores
it and `anchors()` throws `RangeError`, and still throws after
subsequent clean ingests — `Backing` has no delete, so recovery is
discarding the store. Two corrections: (1) the filter at
entity.test.ts:48 does NOT exclude NUL — the generator itself emits
printable ASCII only (30,000 samples, code points 32–126), so the
pre-sanitized-domain conclusion holds for a stronger reason than
stated; (2) reachability is latent — `anchors()` has one non-test
caller (`runCollect`), itself only called from a test, so no shipped
ingress path feeds a collector today. Incidental finding: the lossy
decoder silently collides — payloads `0xff"=v"` and `0xfe"=v"` fold to
the same key U+FFFD and the same stateDigest while their chain heads
differ. `composeEntities` shares the hazard.

**C2 — WEAKENED.** The code fact is confirmed (Open adopts the tail
head with no byte check; Read never lowers an Open-adopted cursor; no
test reopens over a tampered tail; protod ingress.go:108–118 appends
and republishes the head with no genesis read on that path). The
overstatement: the proposed one-line check is a canonicality predicate
and the stated consequence is realized with canonical bytes — a forged
canonical tail passes the check and poisons the head anyway, while the
non-canonical case the check does catch yields the honest digest via
`EntryDigest(decoded)` and does not poison the head. Remedy and
consequence apply to nearly disjoint scenarios. The residual defect is
real but is fail-fast/diagnostics, not the integrity hole the wording
implies. Mitigations omitted: protod's catalog does a genesis Read at
construction; application credentials cannot publish to `j.>`;
DenyDelete/DenyPurge means a tampered tail already bricks the journal.

**C3 — CONFIRMED.** Every leg is an unconditional code path.
CONTRACT.md:115–117 ratifies openness and DECISIONS.md D5 records the
strict alternative as explicitly rejected; `decodeBody` uses plain
`json.Unmarshal` (no DisallowUnknownFields) and ingress canonicalizes
the raw body, so extras persist; contract.go:195–198 describes a
closed two-field struct; codegen.ts:186 closes every struct and
codegen.test.ts:221–236 pins that; mcp.ts:43 builds the publish tool
from exactly that node and mcp.test.ts:115–119 asserts the served
schema equals it. Sharpening: DECISIONS.md D21 rejected closed-struct
description for `structure` precisely because "it would make MCP
clients reject valid structures" — the ingress frame got the treatment
D21 refused. Severity bound: the Effect MCP pin skips server-side
schema validation, so a client that ignores the advertised schema is
still admitted; the defect is what schema-validating hosts are handed.

**C4 — CONFIRMED.** Settled against upstream Apalache source (fetched
`ValueGenerator.scala`, `genSeq` asserts `len <= bound`; `genFun`
recurses with the same bound), not memory. A length-3 catalog
satisfies all seven IndInv conjuncts (explicit witness checked
clause-by-clause), is reachable in 6 steps from Init, and is
unrepresentable under `Gen(2)` — consecution and action safety were
discharged over a strict subset of IndInv; uncovered: every transition
OUT of a length-3 catalog or a data journal of length >= 3.
Aggravation: `Gen` appears nowhere in README.md or CLIMB.md, while
README.md:150–152 affirmatively claims catalog length carries no
artificial cap, and `data = Gen(2)` caps the hypothesis at the depth
R2's TLC closure already exhausted, eating R3's marginal contribution.
Obligation 3 is a propositional tautology (StateSafety's five
conjuncts are verbatim a subset of IndInv's; the committed run.txt
confirms `--init=IndInit --inv=StateSafety --length=0`); one of the
"four NoError verdicts" can never flip.

**C5 — WEAKENED.** The core holds: the only assertion is per-writer
monotonicity against the goroutine's own ack (assumptions_test.go:362);
eight writers share one connection, so no cross-client freshness is
ever checked; a stale `before` read routes into `continue` with no
assertion — the test cannot distinguish linearizable reads from stale
reads plus CAS, even inside the R1 envelope. Ticket 011:20–21 asked
for "reads that must observe completed writes". The mitigations the
claim's handed form omitted (this document's own C5 text already
carried them): protod.Acquire refuses clustered and R>1 before startup
with a typed error naming the assumption; VERIFICATION.md:132–134
bounds the assumption to the R1 configuration in the sentence naming
the test; the direct-get staleness is already documented in the
source-verified JetStream report. Residual that survives: the test
under-tests its name at R1 too; go/AGENTS.md:17–18 states
"linearizable reads" unqualified; and the envelope is enforced only at
the protod seam — `effector.Open`/`journal.Open` accept any
caller-supplied JetStream and neither shape gate checks `Replicas`.

**C6 — WEAKENED.** The import trace reproduced exactly: two
out-of-package consumers, `stream.ts`/`xform.ts` only; the tower is
transitively unreachable from both entry points; `foldCache` has no
reader outside its test; no Go twin exists. Two corrections: jcs.ts
does not terminate in its own tests — `packages/core/scripts/jcs-probe.ts`
is a shipped CLI executed by the Go differential fuzzer and named in
CI (still a testing surface, so it dents wording, not substance). And
"the EXACT structural pattern the mint rollback deleted" overstates:
NEXT.md:112–114 gives three rollback reasons of which the fold algebra
shares one (no consumer) but not the others (it has ticket 014's
ratified plan; ADR-0010 frames it as the lawful answer to the mint
pattern); the consumer-gate was consciously applied to `range`. The
lawful-but-not-load-bearing observation stands.

**C7 — WEAKENED.** The TS half is exactly right and was proven by
mutation: a `compact` returning a reversed tail passes every assertion
in stream.wall.test.ts and stream.property.test.ts while breaking the
identity half of the law — and passes every Go test too, since Go's
implementation is untouched. The generalization fell: the claim's "no
test over arbitrary histories and arbitrary cut points" is false —
go/stream/fuzz_test.go:240–273 (`FuzzCompactionPreservesBothFolds`)
and go/stream/stream_test.go:135–164 quantify both halves of the law
at every boundary, and VERIFICATION.md places the property/fuzz tier
in Go by design. What survives: the "(tested)" parenthetical at
stream.ts:290 — the only such parenthetical in the repo — sits on the
side that does not test the law, and a TS-side defect class exists
that no current test can catch. Caveat on the Go fuzzer: no committed
corpus, so the normal gate runs its three seeds.

**C8 — REFUTED.** SPEC.md:53–56 attaches "filled body templates" to
FACTS; refusals are promised only hints "sufficient for self-repair
without external docs", and CONTRACT.md:125 marks hint `body`
optional. Bodyless refusal hints are pervasive and the suite is green,
so the claimed reading would make the daemon fail its own tests
everywhere. The cited hint's verbatim replay refuses `malformed` and
returns `describeHint()` — one wasted round trip that itself teaches;
the sibling `readCatalogHint` on the same refusal is fully replayable
and is the actual repair route; a filled digest is impossible in
principle (the daemon cannot know the intended type, and a fresh
catalog may be empty). The concierge teachFill/teachUnfill hints echo
the refused request as an edit-template by design, with the note
saying so, frozen in concierge.json. What survives is inert: no test
replays hint bodies — true, and a violation of nothing promised.
The dead-end framing is withdrawn.

## Disposition owed

C1, C3, C4 stand confirmed at high confidence with executed evidence
and await operator disposition. C2's residue is a fail-fast gap, not
an integrity hole; C5's residue is a naming/witness gap inside an
enforced envelope plus the unguarded library seam; C6's residue is the
consumer question ADR-0010 already carries; C7's residue is one
misleading comment and a TS-only blind spot demonstrable by mutation.
C8 is withdrawn.

## Live proof-team findings (2026-08-13, Mac session — for the PC team)

Three Opus teams run in isolated worktrees on the Mac under a
15-minute consultation loop: a PROVER (R3 repair and completion), a
HARDENER (model robustness), and a BREAKER (adversarial probes plus
audit duty over the other two). Discipline in force: no verdict
without verbatim checker output on disk, canary state-counts are
sacred, findings before fixes. Evidence branches (pushed to origin):
`worktree-agent-a832c002de4e1234c` (PROVER),
`worktree-agent-a0f6f6a10c577aa55` (HARDENER),
`worktree-agent-ad1028e2ec230ef75` (BREAKER).

### FINDING-R3-001 — the R4 merge broke R3's re-checkability (repaired, repair certified)

The R4 claim commit (`0701b8b`) added untyped wire-bridge accessors
(`ModelState`/`CatalogOf`/`MirrorOf`/`DataOf`/`CreatorsOf`/`Become`)
to `Catalog.tla`. Apalache's Snowcat now fails type-checking before
any proof obligation runs: every R3 obligation at HEAD exits
`ERROR (120)` ("Cannot apply s to the argument 1 in s[1]"). A gate
that cannot run cannot fail. Verified both directions: obligation 1
against the pre-R4 spec returns `NoError` in 3s (the historical
verdicts were real); the identical command at HEAD dies in Snowcat.
Repair applied on the PROVER branch: `@type` annotations only —
certified inert by the exact cap2 TLC canary (119,145 / 18,295 /
depth 16; TLC ignores annotations, so any drift would have meant more
than types moved) and by obligation 1 returning `NoError` at HEAD.
Trap for future editors, recorded in R3-DECISIONS: prose inside a
`.tla` comment must not contain a literal `@type` token — Snowcat
counts it as a second annotation on the next declaration.

### FINDING-BRIDGE-001 — half the R4 bridge is asserted, not checked

`AtomicRefinement == [][CreateAtomicRefinesSplit]_vars`, and
`[P]_vars == P \/ UNCHANGED vars`. `CreateAtomic`'s resolving branch
IS `UNCHANGED vars`, so TLC discharges it as a stutter and never
consults the bridge there — while `CatalogWire.tla`'s header and
README's "How R4 attaches" both say the relation is checked directly.
Proven mechanically (probe module extends CatalogWire, edits nothing;
cap2 bounds):

- W3 reachability witness: "no reachable state enables the resolving
  branch" — violated at depth 2, so the branch is exercised;
- W2 positive control: a false obligation about the CREATING branch —
  violated at depth 2, so the harness can fail there;
- W1 the finding: a knowingly FALSE obligation about the RESOLVING
  branch (`StutterOnlyAtomic => FALSE`) — CLEAN to closure
  (9,133 / 863 / depth 11).

The resolving case looks true by inspection (both sides reduce to
`~creators[c].busy /\ UNCHANGED vars`), so this is not evidence of an
unsound bridge — it is a prover-that-cannot-fail defect in the
just-claimed R4 gate. The same mechanism exempts `Publish`'s refusal
branch from both action properties. Write-up with a proposed
checkable reformulation (the resolving case as a state-level
implication TLC evaluates on every reachable state):
`verify/catalog/probes/FINDING-BRIDGE-001.md` on the BREAKER branch.
Disposition is the operator's; nothing ratified was modified.

### FINDING-BOUNDS-001 — configs silently truncate at 4

`Catalog.tla` builds every domain as `{ x \in 1..4 : x <= NumX }`:
any config value above 4 silently yields 4 with no warning, and
`CatalogNaturallyBounded` is stated against the CONSTANT (`<= NumVals`)
rather than the actual value domain — so raising `NumVals` past 4
both fails to widen the model and loosens the invariant meant to
certify the natural bound. Evidence: `NumVals = 4` and `NumVals = 9`
produce byte-identical closures (1,757 generated / 457 distinct /
depth 10). A future "checked at 6 values" claim would come back green
covering nothing new. Fix in flight on the HARDENER branch: `ASSUME`
guards on all constants; the semantic fix is stating the invariant
against `Cardinality(Vals)`.

### Repairs and hardening in flight

- PROVER: hypothesis bounds repaired — `catalog = Gen(3)` (the exact
  natural maximum; the committed Gen(2) under-covered IndInv, claim
  C4), `mirror = Gen(4)` / `creators = Gen(4)` justified against
  natural maxima rather than raised, `data = Gen(2)` under a written
  cutoff argument (data appears only pointwise in TypeOK,
  NoAdmissionOnFaith, and AdmissionStep; no guard reads it at
  DataCap = 0; CommittedIds monotonicity confines any new violation to
  the appended entry) with a `Gen(3)` consecution run as the stated
  empirical insensitivity control. Obligation set restructured to
  3 obligations + 3 controls: the tautologous StateSafety check (claim
  C4) is demoted to a labeled drift-tripwire; a new control 6b
  requires the blind config to return `NoError` on
  `MonotonicityStep`, proving the control refutes exactly its own
  law. `run-ind.sh` written: portable sha256, recorded jar shas,
  per-run verbatim logs; controls run as single named invariants
  because Apalache reports violations by conjunct index, which
  renumbers under edits. Full repaired obligation set is running.
- HARDENER: `run.sh` sha256 portability landed (`sha256sum` →
  `shasum -a 256` fallback). Queued behind an untouched-baseline rule
  (no spec edit until both baselines land): the ASSUME guards;
  `AdmissionStep`/`MonotonicityStep` stated once in `Catalog.tla`
  (closing the duplication that could let R3 silently check a
  different law than TLC); `LagIsAbsenceNeverWrongData` split into
  named clauses `LagPrefixLength` / `LagPrefixContent` (conjunction
  unchanged) plus a new `OverrunMirror` faithless constant so a mirror
  fabricating PAST its origin's head is refutable — a second constant
  rather than a widened `ForgedMirror`, so the existing depth-4
  content refutation survives; each control refuted on exactly its
  clause, the other checked and passing (independence). All four cex
  traces will be regenerated same-jar with recorded counts as
  canaries (forge 237/76/4, blind 14/2, assert 27/3, reset 856/5,
  bridge 2/2/2).
- Cross-checks that came back clean: the cap2 canary reproduces
  byte-exact on macOS in three independent worktrees (first non-Windows
  runs of the gate); the tla2tools jar hashes to the recorded
  `ab323b79…46c05f`; the Apalache 0.61.0 jar hashes to the recorded
  `33611081…ad4346`; BREAKER's vacuity audit found no invariant clause
  quantifying over an empty set, the stale-CAS conflict branch firing
  14,736 times at cap2, and `MirrorReset` dead at the gate config by
  design (covered by its negative control).

### Ledger edits owed at merge (operator-owned; proposed, not made)

- VERIFICATION.md's R3 entry: state the Gen bounds inside the claim
  sentence; note FINDING-R3-001 (R3 restored re-runnable at HEAD);
  count 3 obligations + 3 controls.
- VERIFICATION.md's "four sabotaged variants … at depths 2/3/4/5"
  becomes five variants once `CatalogBroken.overrun.cfg` lands.
- The R4 entry owes a FINDING-BRIDGE-001 disposition: either the
  reformulated checkable bridge, or a stated-abstraction note that the
  resolving case is discharged by inspection, not by TLC.

## Operator ratifications (2026-08-13, recorded by the PC coordinator)

Relayed from the operator in session; implementation ownership stated
per item so the lanes do not collide.

1. **FINDING-BRIDGE-001, Proposal 1 — RATIFIED.** `ResolvingCreateAgrees`
   enters `CatalogWire.cfg`'s INVARIANTS; the README "How R4 attaches"
   sentence is corrected to: creating case checked as an action
   property, resolving case checked as a state invariant. Implementation
   lands in the Mac lanes (they hold the probes, controls, and canary
   discipline in flight). PC replication before ratification: all seven
   W/X probes rerun on Windows, verdicts and closure counts exact
   (W1 clean 9,133/863/d11; W2 violated d2; X1 clean 9,133/863;
   X2 violated d2; X3 clean 119,145/18,295; X4 violated; X5 clean
   163,101/21,977). Note for the gate scripts: TLC on Windows rejects
   path-qualified module names — invoke with `-DTLA-Library=probes` and
   the bare module name.
2. **Proposal 2 — RATIFIED as a strengthening.** `AdmittedStaysResolvableAtD`
   enters the ratified invariant set with `ResettingMirror` as its named
   negative control (the X4/X5 pair is the evidence it is strictly
   stronger than `NoAdmissionOnFaith` over identical behaviors). The
   `Publish` refusal branch receives the same state-invariant treatment
   where its checkable content is prime-free. Binding consequence,
   answering OBSERVATION-STRONGER-ADMISSION's ownership question: future
   replica resync design must preserve this law — a drop-and-refetch
   resync that erases local resolvability is now a ratified-law
   violation, and if replica reality ever demands it, that returns as a
   grill, never a silent weakening.
3. **Bridge disposition scope (three layers, for the eventual ledger
   edit at merge):** (a) TLA bridge, resolving half — was asserted, not
   checked; repaired by Proposal 1. (b) Binary lockstep layer — NOT
   affected: `CreateAtomic.converged` and `Publish.refused` are driven
   branches in the 131-schedule corpus with post-state comparison and
   corrupted-expectation sensitivity on both; a proof-mechanics defect,
   not a binary defect. (c) The claim text — "checks that relation
   directly" was the only false statement; it gets the correction.
4. **TS refusal-domain batch — RATIFIED and dispatched (PC side).**
   C1/M1/J1/A1 fixed as one law (every packages/core fold entry point
   total by refusal) with regression-first discipline and an
   adversarial generator flip; spec at scratch/codex/22 (PC), branch
   codex/ts-refusal-wall when in flight. packages/core only; verify/
   remains Mac-lane territory.
5. **C4 status (PC side):** an independent widened-hypothesis run is in
   flight on Windows at catalog `Gen(3)` / mirror `Gen(6)` / data
   `Gen(4)` — deliberately wider than the PROVER's argued-cutoff bounds
   — as the cross-platform, cross-bounds replication of the R3 repair.
   Same jar (sha `33611081…ad4346`), all four obligations including
   both controls. Verdicts will be appended when they land.

## Review cycle closed — issues filed, two cores certified clean (2026-08-13)

Standing order in effect: confirmed findings are filed as GitHub issues on
`mepuka/foldlab` with full evidence (executed repro or committed checker
trace, file:line, severity, evidence branch). Eleven issues filed this cycle;
every repro was re-run independently by the coordinator before filing.

### The two results that matter

- **The effector is certified clean against a binary-vs-proven-model gap.**
  The register whose fencing safety is the machine-checked theorem (Apalache
  inductive invariant, R4 lockstep) was attacked with executed Go tests on the
  steal/commit CAS paths, the stale-read-then-mutate window, and the
  expired-unsuperseded commit path. All held: a claim superseded by a higher
  fence cannot land a commit below the highest fence (`ErrFenced`, because the
  revision-CAS is the real linearization point — fence is authority, expiry is
  liveness-only); terminal-outcome uniqueness holds; the one "resurrection"
  runs as admin and is the admin-success negative control already gated in
  `go/substrate/assumptions_test.go`, not a leak. Write-up:
  `_bugs/EFFECTOR-CERTIFIED.md` on `worktree-agent-aaf7f65ab3380d246`.
- **The model's safety laws survived the adversarial pass within bounds.** Y5
  (2 creators — the R3 domain count, where the CAS-freshness \A-over-creators
  clause is non-trivial) came back clean over 39,897 IndInv-satisfying states,
  no counterexample to induction, no stuttering exemption. Both CTI families
  are excluded structurally (each is the definitional negation of a named
  invariant conjunct). Verdict: the residual risk was never in what the model
  proves, only in what the gate checked it with (#8, #9) — both fixable,
  neither a live violation. Write-up: `probes/BREAKER-VERDICT.md`.

### Issue index

Code defects (`bug` + `finding`):

- #1 JR2 (high, exploitable) — journald wedges permanently on a lost CAS race; shown end-to-end at the daemon.
- #2 JR1 (medium) — journal.Open adopts an unverified tail; verify-on-read hole.
- #3 CG1 (medium) — journal content-identity non-injective on invalid UTF-8.
- #4 C1 (high, latent) — entity collector poisoned by one NUL-key event; applySync unwalled.
- #5 A1 (medium) — Declaration brand forgeable via Symbol.for; a law-violating algebra is certified.
- #6 J1/M1/S1 (low) — TS-core canonicalization/identity/portability leaks.
- #10 JR3 (medium) — position conflict misclassified as "unavailable" when the re-read fails; compounds JR2.
- #11 A2 (medium) — mappedStep omits the source-match check mapped enforces; no forgery needed.

Proof-mechanics (`proof-mechanics` + `finding`):

- #7 FINDING-R3-001 — the R4 merge broke R3 re-checkability (Snowcat fails at HEAD); repair applied and certified.
- #8 FINDING-BRIDGE-001 — half the R4 refinement bridge is asserted, not checked; reformulation tested, awaiting disposition.
- #9 FINDING-BOUNDS-001 — catalog model constants silently truncate at 4; fix in flight.

Bug tally: 9 confirmed (C1, CG1, JR1, JR2, JR3, A1, A2, J1, M1), 1 suspected
(S1), 3 certified clean (effector A6 register, jcs canonical TS↔Go, stream KV
algebra TS↔Go). Exploitable-today: the journal multi-writer path (JR1/JR2/JR3)
in shipped journald; the rest latent until wired.

### The pattern

The walled cores (jcs, stream KV) and the proven core (effector) are lawful
and compose — cross-language and model-to-binary. Every leak is a *second
encoder* of a walled form (applySync, EntryDigest) or a *construction that
re-incurred a proven obligation without re-proving it* (mapped/mappedStep on a
forgeable-or-unchecked brand, applyMerge dedup, Open/cursor). This is the
compositionality-of-proof thesis stated as a defect taxonomy: build on a
lawful surface and the law is inherited; hand-roll a parallel path and it is
not.

## Closure table (2026-08-13, end of cycle — supersedes "Disposition owed")

| Claim / finding | Issue | Landed | Status |
|---|---|---|---|
| C1 collector poisoning | #4 | 045616863 (one walled kvStep, forgive-on-meaning) | FIXED |
| C2 / JR1 unverified tail | #2 | 2505e76c7 (tailCursor, one adoption path) | FIXED (fail-fast scope per refuter) |
| C3 frame-schema drift | — | remains open; owned by the proto contract lane | OPEN |
| C4 R3 hypothesis bounds | #7 | R3 repair merged 6b713a639; claim HELD pending re-proof verdicts (two platforms) | REPAIRED, RE-PROOF RUNNING |
| C5 linearizable-reads naming | — | residuals tracked (test rename, library-seam Replicas gate) | OPEN (residuals) |
| C6 tower consumer | — | answered by design: ticket 020 phase 1 (JournalMessageStorage), task 25 | DESIGN RATIFIED |
| C7 two-fold law TS blind spot | — | "(tested)" comment + TS mutation gap remain queued | OPEN (residuals) |
| C8 refusal dead-ends | — | REFUTED by the refutation pass | WITHDRAWN |
| JR2 wedged writer | #1 | 2505e76c7 | FIXED |
| JR3 conflict mislabel | #10 | 2505e76c7 | FIXED |
| CG1 identity non-injective | #3 | journal-gate containment 2505e76c7; canonical-boundary closure dd658a214 | FIXED |
| A1 forgeable brand | #5 | f1434c991 | FIXED |
| A2 mappedStep gate | #11 | f1434c991 (+ cache binding 531ca6d56) | FIXED |
| J1 encodeValue domain | #6 | 243caeb54 | FIXED |
| M1 merge duplicate seqs | #6 | dd658a214 (both runtimes + shared vector) | FIXED |
| S1 Bun coupling | #6 | 243caeb54 | FIXED |
| FINDING-R3-001 re-checkability | #7 | 6b713a639 (annotations certified inert) | FIXED |
| FINDING-BRIDGE-001 vacuous half | #8 | b93867814 (ResolvingCreateAgrees in the gate) | FIXED; strengthenings with HARDENER |
| FINDING-BOUNDS-001 truncation | #9 | HARDENER ASSUME guards | IN FLIGHT (last open issue) |
| Effector A6 register | — | certified clean on the running binary | docs/research/2026-08-13-effector-certified.md |

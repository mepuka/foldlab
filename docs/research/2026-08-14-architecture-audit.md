# Architecture audit: the three lanes, their depths, and the ground-truth program

AUTHORITATIVE. Coordinator-run synthesis, 2026-08-14, from two very-thorough
exploration lanes over `main` at `21d77220c`:

- [Go lane report](2026-08-14-architecture-audit-go-lane.md) — protod, effector,
  stream: component map, end-to-end data flows, atomicity findings.
- [TS lane report](2026-08-14-architecture-audit-ts-lane.md) — wire/client/
  author/codegen/mcp/session, packages/core algebra: type-modeling findings.

Every claim below is backed by a file:line citation in one of the lane reports;
this document ranks and decides, the lane reports evidence. The union-refusal
path defect found earlier this session is fixed on branch
`codex/union-refusal-path` (`ab77d6bfce`, unmerged) and is not re-reported.

## 1. Verdict

The program is feasible. The operator's architecture sentence — "NATS messages
→ CAS effector → continuation-modeled TypeScript" — is correct after one
correction that the estate's own theory already makes: CAS appears in two
places with two different justifications, and they must not be conflated. The
corrected pipeline:

> NATS (data-only boundary, ADR-0003) → certify/admit (evidence lane:
> presence is monotone, plain checks) → journal CAS (position conflicts;
> exists because *absence goes stale*) → effector register (decision lane:
> single writer, fenced CAS) → journal facts → TS Effect replay
> (continuations become data at commit points; replay is a fold that returns
> `Done` results instead of re-executing).

Nothing found threatens feasibility. The finding is structural: **the three
lanes are built to different depths and not yet connected.**

- `protod` never uses the effector (deliberate for the tracer; stated at
  `contract.go:233`). The only effector transport is `journald`, which has an
  authority leak (§2.1).
- The continuation leg is design-only: zero `WorkflowEngine` code; the session
  transcript is an audit log, not a replayable continuation. The
  register↔`Workflow.Result` mapping is ratified and sound (tickets 008/020),
  unbuilt.
- The fold algebra is law-tested and consumed by nothing in production.

## 2. Ranked defects (damage × cost-of-later)

1. **journald authority leak.** The wire reconstructs
   `effector.Claim{Digest, Fence, Owner}` from client-supplied fields
   (`journald/main.go:265-269`) and `Commit` checks only the fence
   (`effector.go:287-295`) — so any client that observes or guesses a fence
   can commit another worker's claim. The register's proof is intact; the
   transport gives the capability away. Fix shape: the daemon, not the
   client, must hold claim tokens (or bind owner at the seam).
2. **`createReply` pairs a seq with the wrong head.** Fact at seq N, scheme
   bridge at N+1 (`catalog.go:226-232`), head read outside the lock after
   both (`dispatch.go:109`); `catalogHead`/`catalogSeq` never name the same
   position and no test asserts either. The correct pattern
   (`frontierSnapshot`, `catalog.go:111-126`) exists and is unused here.
   This is exactly Task 32's `catalog_head` provenance requirement.
3. **Ingress is not strict.** Unknown frame keys are canonicalized durably
   into the journal (`ingress.go:92-106`; no `checkKeys` on `frame`),
   contradicting the walk's own strictness law (`walk.go:14-15`) at the one
   seam where author bytes become permanent. Untested.
4. **Lost CAS = dropped reply.** `journal.ErrConflict` on create/ingress
   becomes a client timeout (`ingress.go:112-115`), though it is a domain
   fact. `serveSessionMove` shows the correct conversion
   (`session.go:313-316`).
5. **Wire drops falsy evidence.** Go `omitempty` on `Got`/`Expected`/
   `Example` (`refusal.go:88-92`) erases `got: 0`, `got: false`, `got: ""`;
   TS reads absence. Conformance corpus has no case.
6. **`refuse()` panics on an unclassified kind** (`refusal.go:105`) inside a
   handler goroutine — a map lookup where compile-time exhaustiveness is
   wanted.
7. **MCP refusal vocabulary is hand-maintained and unwalled**
   (`mcp.ts:31-63` vs `localRefusal` call sites; `asRefusal` decodes wider
   than the advertised schema).

## 3. The modeling finding: the IR is a predicate, not a type — on both sides

`flb.type.v0` — a closed 13-kind grammar — is `map[string]any` in Go and
`Json` in TypeScript. The grammar is restated at least six times in Go (walk,
normalize, replaceTypeNode, normalizeSessionPartial, completion.go's
closedTypeGrammar, sessionGrammarDescriptor) and four more in TS (three
codegen switches + session productions), with **divergent defaults**: the walk
refuses unknown kinds; `normalize` passes them through unchanged
(`normalize.go:65-119`, no default); the session normalizer shallow-clones
them (`session.go:701-750`). Nothing walls the restatements against each
other. This is the drift engine that produced the union-path defect.

The remedy is the estate's own thesis applied to itself — "codegen is a
semantic fold over the AST" (`docs/explanation/theory.md`) — so give the AST
an algebraic type and write the fold once:

- **Go**: parse-don't-validate. The walk returns a typed tree (a sealed sum),
  not facts-about-`any`; normalize/frontier/replace become folds over it.
- **TS**: a closed discriminated union (Effect Schema) for `flb.type.v0` and
  a partial-with-holes variant; retire `V0 = { [k: string]: Json }`.
- **Both**: a generated kind-list fixture walled on both sides, so no
  restatement can drift silently.
- Same medicine for the effector's implicit sums: `authorityValue`'s two
  nilable pointers and `Lookup`'s "Outcome meaningful only when Committed".

The reference semantics for all of this is the Lean ground-truth model (§5).

## 4. The proof gap list (ranked)

| # | Proof | Why it is next |
| --- | --- | --- |
| 1 | **The snapshot law** — every reply that names a head names the head its facts were read under. | Cheap; fixes defect 2 by construction; it IS Task 32's `catalog_head` ratification. Pre-registered as this audit's safety-by-construction candidate. Model gate: `verify/pipeline/`. |
| 2 | **Journal model gate** (ticket 012) — JL0–JL7 have no TLA model; identity/meaning fold claims stand at R0/R1. | The journal is the substrate under catalog, sessions, and the future corpus; the layer above it got a gate, it did not. |
| 3 | **Replay soundness** — register linearizability + content-keyed activities ⇒ fold-over-`Done` reproduces the run. | The theorem to hold BEFORE building tickets 008/020. Composes over the already-proven register laws. |
| 4 | **Effector clock honesty** — `Commit` safety is fence-only (proved); `Claim` mutual exclusion and `Lookup` expiry are cross-process wall-clock comparisons with unbounded skew; the package doc overclaims ("never the holder's clock"). | Either ledger the skew assumption in VERIFICATION.md standing assumptions or prove which properties survive without it. Watch losslessness (FINDING-WATCH-EVICTION-001) rides along. |
| 5 | **Grammar single-source wall** + the decision-equivalence Lean lemma left open in `verify/implication/`. | Hygiene; prevents the next union-style defect. |

## 5. The ground-truth program (operator-ratified this session)

The operator has committed to a mechanized ground truth for the model. The
program, in increments, each with its own gate and ledger row:

1. **`verify/ir/` (Lean)** — the typed IR and its denotational semantics:
   `TyX H` (one hole-bearing parameter, so closed and partial terms are one
   type at two instantiations), value conformance `⟦t⟧` with a fuel-indexed
   resolver for refs (DAG-justified), and the prose laws as theorems:
   brand/check denotational invisibility, normalization preserves meaning,
   resolver monotonicity (evidence-presence monotone, at the type level),
   C5 embed/close round trip. Structs are denotationally CLOSED — derived
   from the shipped json-schema target (`codegen.ts:243`,
   `additionalProperties: false`), not newly decided.
2. **`verify/pipeline/` (TLA+)** — the create pipeline at small bounds:
   two-entry commit (fact + bridge), concurrent creates, head reads; the
   snapshot law as the clean invariant and the as-shipped head-read as a
   faithless control that must be refuted (defect 2 reproduced by model
   checker); the bridge-crash orphan residual recorded.
3. **Journal gate** (ticket 012) — JL0–JL7.
4. **Replay soundness** composed over the effector spec (before 008/020
   build). Statement sharpened, and the authoring-direction design
   recorded, in
   [the workflow authoring and emission design](../design/2026-08-14-workflow-authoring-and-emission.md)
   (operator intent↔model mapping ratified 2026-08-14).

Discipline as in `verify/implication/`: no `sorry`, controls with committed
traces, `run.sh` gates, run records pinned by recording, claims ledgered in
VERIFICATION.md or not made.

## 6. Provenance

Lane reports: two Explore agents, very-thorough setting, this session; full
texts persisted as the two companion documents with their file:line citations
intact. Synthesis and ranking: coordinator. The feasibility verdict inherits
the learning-limits corrections (`2026-08-14-learning-limits-literature.md`
§9) and the implication-refusals formalization
(`2026-08-14-implication-refusals-formalized.md`): the impossible claims are
already fenced; what remains is engineering unification, not invention.

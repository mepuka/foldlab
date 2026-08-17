# Lane report — the sub-session hole (G1–G9)

Date: 2026-08-16. Repo: `C:\Users\kokok\Dev\foldlab`, branch
`agent/codex/kernel-hygiene-gates`. All experiments run on this machine; all
transcripts are in this directory.

Classification key, per the dispatch:
**(a)** answerable now by an existing law or code path (cited);
**(b)** needs a new model/theorem (named, with the development it extends);
**(c)** a genuine design decision for the operator (alternatives + costs).

---

## Result first

Five of the nine questions are already answered by shipped code that nobody
has connected to this proposal. Two need new theorems and I can name them
exactly. Two are real decisions. Two of the note's own instincts are wrong in
a way the machine can demonstrate.

The corrections, stated up front:

1. **G7's "pin to head" is the wrong noun.** The shipped `predecessor` pin is
   to `final_state_digest`, and the head is provably unsuitable: a *closed*
   session's head keeps moving while its final-state digest does not
   (experiment E8). The instinct was right; the field was wrong.
2. **G4's "parent hole filled with closed child" is not a stable predicate.**
   `filled` is not stable in the model and not stable in the daemon — a second
   seat's fill demotes it to `disputed` (E2, E9). Only `decided` and Go-side
   `sealed` are stable, and `sealed` has no counterpart in the Lean model.
3. **The shipped conformance checker admits a fabricated certificate** (E4).
   A sub-session hole built from today's `flb.type.v0` vocabulary alone is an
   asserted identity, which is exactly what W1 forbids.
4. **G5 is stronger than the note's three options.** A protocol-digest cycle
   is a SHA-256 fixed point, not a validation question. No depth bound, no new
   well-foundedness check — *provided* the child protocol is pinned by digest
   inside the parent protocol value.
5. **The one-state-digest invariant does not lift to trees**, and I killed the
   lift mechanically rather than by argument (E5). The reason is precise: the
   invariant quantifies over a bag of moves, and a child-closure gate is not a
   function of that bag.

---

## Environment and toolchain checks (recorded, per discipline)

Run 2026-08-16.

| Tool | Check | Result |
| --- | --- | --- |
| bun | `bun --version` | `1.3.14` |
| go | `go version` | `go1.26.5 windows/amd64` |
| lake | `lake --version` | `Lake version 5.0.0-src+d8b1897 (Lean version 4.33.0)` |
| lean | `lean --version` | `Lean (version 4.33.0, x86_64-w64-windows-gnu, ...)` |
| Lean model | `lake build Moves` in `verify/moves` | **exit 0**, "Build completed successfully (8 jobs)", warnings are unused-section-variable linter notes only |
| Go daemon | `go test ./protod/ -run TestProtocolBindingsCloseAndPredecessorAreAuthoritative -count=1` | **PASS** (0.07s) |

Lean/lake availability was listed UNKNOWN in the brief. It is present and the
`verify/moves` package builds clean at the pinned toolchain
(`verify/moves/lean-toolchain` = `leanprover/lean4:v4.33.0`).

---

## Experiments

Scripts and transcripts in this directory.

| # | What | How | Transcript |
| --- | --- | --- | --- |
| E1–E5 | The E2 kernel driven with a sub-session certificate as its `Value` | `bun run probe1-kernel.ts` | `probe1-transcript.txt` |
| E6–E11 | A real in-process `protod` over embedded NATS/JetStream | `go run .` in `goprobe/` | `probe2-transcript.txt` |
| E7–E12 | Session-key derivation, digest coverage, clean demotion | `go run .` in `goprobe2/` | `probe3-transcript.txt` |
| — | PDF text extraction for the prior-art source | `bun run pdftext.ts <pdf>` | `demangeon-honda.txt` |

Notable: in the first Go probe, what I intended as a "fresh" parent session
turned out to be the *same* session as an earlier one. That accident is the
lane's most useful finding (E7): protocol sessions are content-addressed by
their open event, so `(protocol, bindings, predecessor)` **is** the session
key. `goprobe2` re-ran the demotion probe on a genuinely distinct session.

---

## G1 — What is the fill value? -> **(a)**, with one **(c)** inside it

**The shipped precedent is `validatePredecessor`.** `proto/go/protod/protocol_session.go:450-474` already implements "a reference to another session's terminal state, resolved locally, never asserted":

- the reference shape is `protocolPredecessor{Session string; StateDigest string}` (`protocol_session.go:20-23`) — session key plus final-state digest, **no head**;
- it resolves by `lookupProtocolSession` + `replayProtocolSession` (full journal replay);
- it refuses `KindDigestMismatch` unless `fold.Status == "closed" && fold.FinalStateDigest == predecessor.StateDigest`.

The digest is genuinely re-derived, not trusted: `protocolSessionTransition` recomputes it through `protocolCloseStep` and refuses the stored event if they differ (`protocol_step.go:281-283`). I re-derived the preimage independently, client-side, from the state reply and matched the stored value (E8).

**What the checker cannot do today (E4).** `checkCatalogedValue` (`value_check.go:12-24`) resolves the *hole's type* from the catalog and then structurally checks the value against that `flb.type.v0` structure. It has no vocabulary for "this string must resolve to a closed session." Mechanically: I filled a sub-session-shaped hole with a certificate naming session `...dededede...` and digest `...adadad...` — neither of which has ever existed — and the daemon **admitted it** and set the hole to `filled`. That is an asserted identity; `KindDigestMismatch` is documented as "asserted identity the daemon cannot re-derive (W1)" (`refusal.go:32`).

**New result — half the certificate is derivable with no journal access (E7).** The session key is `protocolSessionJournalPrefix + canonical.DigestHex(payload)` where `payload` is the canonical bytes of the open event (`protocol_session.go:140-149`). I reproduced it purely client-side:

```
client-derived session key   flb_protocol_session_v0_4a3f40c34416a171...
daemon-returned session key  flb_protocol_session_v0_4a3f40c34416a171...
KEY IS A PURE FUNCTION OF THE OPEN EVENT   true
```

So a certificate carrying `(child protocol digest, child bindings, child predecessor)` lets **any** party recompute the session key with zero I/O. Only `final_state_digest` needs the journal.

**The pin's coverage boundary (E8).** After close, a *new* `(value, seat)` pair on a sealed hole still appends an evidence receipt (`protocol_step.go:128-140`). The head moves; the stored digest does not; and recomputing the digest from the *current* fold yields a different value:

```
stored final_state_digest at close      e46e0d60eff5beb166203875b0592ac3...
recomputed from the fold at close       e46e0d60eff5beb166203875b0592ac3...   (match)
stored final_state_digest after receipt e46e0d60eff5beb166203875b0592ac3...
recomputed from the CURRENT fold        15726cce356a4f03cfae37344dd942b5...   (differs)
```

This is not a defect — the pin is *defined* over the fold at the close event and is re-derived there — but it is a boundary that must be stated: **the pin commits to meaning-at-close; the post-close evidence tail is outside it.** Two audits of the same pinned child see the same meaning and possibly different evidence.

**Answer.** The fill value is a certificate, not a bare digest, and the daemon must recompute at *fill* time (not audit time) exactly what `validatePredecessor` recomputes now: replay the child journal, confirm `closed`, compare the digest. Nothing needs deferring to audit.

**The (c) inside it.** Whether the certificate carries `(protocol, bindings)` too:

| Option | Cost | Reversal |
| --- | --- | --- |
| `(session, final_state_digest)` only — mirrors `predecessor` exactly | the key is an opaque token; its meaning is unreadable without the journal; a reader cannot tell *which* protocol ran without resolving | free — it is a hole type, so a new digest |
| `(protocol, bindings, session, final_state_digest, outcome)` | larger values; `bindings` in identity means a re-binding mints a different certificate | free, same reason |

I lean to the second: it makes the key re-derivable and lets `protocol` be pinned as a `literal` (see G2), which is the only part the shipped checker can already enforce.

---

## G2 — What does conformance require? -> **(a)**, both halves

Both of the note's questions are already expressible in the shipped
`flb.type.v0` vocabulary and mechanically enforced, at fill time *and* again
on replay (`protocol_session.go:216` and `:419`).

**Child protocol digest equality:** `{"k":"literal","value":"<child protocol digest>"}`. Literals compare by canonical bytes, never `==` (`value_check.go:51-56`). E4: a certificate naming the wrong protocol digest refused `invalid-structure` / `structural`.

**Outcome discrimination is a declared check, not a second hole type.** E10:

- hole type pins `{"k":"literal","value":"completed"}` -> an `abandoned` certificate refuses `invalid-structure`/`structural`; a `completed` one is admitted;
- hole type declares `{"k":"union","of":[literal "completed", literal "abandoned"]}` -> both admitted (E9 used this form).

So the operator's alternative ("is that distinction a check the hole declares, or two different hole types?") is **settled by shipped machinery**: it is a declared check, and one hole type covers both stances.

**The outcome itself is a total function of the completion declaration.** `protocolCloseStep` sets `completed` iff every name in `definition.Completion` ends `filled` or `decided`, else `abandoned` (`protocol_step.go:226-232`). Confirmed: an empty child closed `abandoned` (E6/P6) — and still carried a `final_state_digest` (`36ddd6a9...`). So a failed subtask is a first-class, pinnable value; the note's instinct that "a failed subtask is still information" is already true at the wire.

**The gap, named.** None of this resolves the child. These literals pin *what the certificate claims*, not *that the claim is true*. The truth check is G1's, and it does not exist.

---

## G3 — Which refusals are absence? -> **(a)** for the sort; **(c)** for cross-venue; **one live misclassification found**

Measured on the shipped predecessor path (E6/P3), reading the persisted `sort` field off the wire:

| Situation | Kind | Sort | Law |
| --- | --- | --- | --- |
| session absent here | `unknown-journal` | **absence** | "lag is absence: this journal does not exist here (yet)" |
| malformed session name | `bad-journal` | structural | content-addressed journal naming |
| wrong final-state digest | `digest-mismatch` | structural | "a successor cites the exact final state digest of a verified closed predecessor session" |
| **child still open** | `digest-mismatch` | **structural** | same sentence |

The first three are right. **The fourth is a misclassification the sub-session hole would inherit.** `validatePredecessor` collapses two different situations into one refusal (`protocol_session.go:464-472`): "you cited the wrong digest" (permanent evidence about the request bytes — structural) and "the child has not closed yet" (a head-relative observation that later presence repeals — which `refusal.go:9-10` defines as *absence*). It also teaches badly: for an open child, `Expected` is `fold.FinalStateDigest`, which is the empty string.

Today that costs little, because a successor round is a rare authoring act. Under a sub-session hole it becomes the *normal* case — the parent fills while the child is still running — and a structural refusal tells the agent's repair policy "do not retry" when the correct advice is "retry after the child closes." **This is a finding against shipped code, not a design question**, and it is cheap to fix: split the branch, keep `digest-mismatch`/structural for a digest that does not match a closed fold, and emit an absence-sorted refusal for `status != "closed"`.

**Cross-venue.** The daemon cannot verify a child it does not hold: `validatePredecessor` requires a local `replayProtocolSession`, and there is no remote-fetch path anywhere in `protocol_session.go`. So the shipped answer is "the child lives here, or it is `unknown-journal`/absence" — and the estate's own doctrine says the resolution is **journal mirroring, not remote trust**: "Evidence federates freely — equal bytes, equal digests, anywhere — so an 'ontology pack' is a catalog journal you copy and verify on read. No package manager, no registry service, no trust in the mirror" (`scratch/dispatch/21-the-use-catalog.md`, E4).

So the sub-session hole **does not** import a cross-venue trust question, provided the rule is "mirror, then resolve locally." The cost is real and should be stated: the parent's venue must hold every descendant journal it wants to verify. Whether to accept a *remote attestation* instead is the (c), and the honest answer today is no — there is no principal authentication to attest with (see G6).

---
## G4 — What is stability, compositionally? -> **(b)**, and the question contains a false premise

**The false premise.** "Is 'parent hole filled with closed child' a stable predicate the watch combinators may expose?" — **`filled` is not stable.**

In Lean: `SpecL8Stable` (`verify/moves/Moves/Spec.lean:77-78`) and its discharge `spec_decided_stable_total` (`SpecProofs.lean:86-89`) quantify over `.decided` only —

```
∀ (s : State) (m : Mv) (h : HoleId) (v : Value),
    s.holes h = .decided v → (repairK s m).1.holes h = .decided v
```

— as does `decided_stable` (`Model.lean:1460`) and `repairK_decided_stable` (`Model.lean:1828`). There is no `filled_stable` and there cannot be: `repair` demotes `filled` -> `disputed` on a clashing fill (`Model.lean:328` ff; `packages/moves/src/kernel.ts:250-258`).

Both instruments show it. E2, on the shipped TS kernel with certificates as values:

```
after builder fills CHILD_A:   {"tag":"filled",...}
after reviewer fills CHILD_B:  {"tag":"disputed",...}
 => a hole filled with a closed child was DEMOTED to disputed by a later fill
```

E9, on the real daemon, with a genuinely fresh parent session:

```
coordinator fills the REAL certificate   ADMITTED
impl state after one honest fill         "filled"
operator fills a FABRICATED certificate  ADMITTED
impl state after the clash               "disputed"
parent close outcome                     "completed"
fenced decision  {"final_state_digest":"bebebe...","session":"...bebebe...",...}
 -> seat-authority order [operator, coordinator] hands the hole to the fabricator
```

That last line is the compositional failure mode in one transcript: **the fence is a function of the candidate set and seat order, and knows nothing about whether a certificate resolves.** A protocol whose fence order puts a careless seat first will decide for a child session that does not exist, and the parent will close `completed`.

**What does lift.** `decided` is stable, so "the parent hole is `decided` with certificate C" is a legitimate stable predicate for watch combinators. And in Go, post-close `sealed` filled holes are value-stable: under `status == "closed"`, `protocolFillStep` only appends candidates and never touches `Value` (`protocol_step.go:128-140`), which E8 confirms (`"value":{"commit":"abc123"}` unchanged while `candidates` grew).

**The smallest new theorem: `sealed_stable`.** `∀ s m h v, status s = closed → holes s h = .filled v ∧ sealed → holes (step s m) h = .filled v`. It extends `Moves.Model`'s stability family (`decided_stable`, `repairK_decided_stable`). **But it cannot be stated in `verify/moves` today**: I grepped the whole model for session-level vocabulary and found none — `status`, `outcome`, `closed`, `completion`, `sealed`, `digest`, protocol record, seat binding are all absent; the only hits are the word "protocol" inside a comment about fence order (`Model.lean:1230`) and "session" inside a docstring (`Model.lean:1459`). The Lean `close` is *per-hole fence sealing* (`kernel.ts:362-366` mirrors it), not session close. So this theorem is downstream of the session-status layer landing in Lean, which `scratch/dispatch/24-ref1-wire-model-spec.md` places in `Moves.Wire`.

**Does the parent frontier surface the child's frontier?** The question is premature in a useful way: **there is no protocol-session frontier at all.** `buildFrontier` (`proto/go/protod/concierge.go:130`) builds a frontier over `flb.type.partial.v0` holes in the *authoring* loop, not over protocol-session holes. And the note's own stated law settles the design: the frontier must be a function of state, never of history. A tree frontier is a function of the *union* of the tree's states, which is not a function of the parent's state. **Therefore a tree frontier cannot be a frontier; it must be a separate query fold** — which is exactly what E1's "the work queue as a fold" already says it is.

---

## G5 — Is recursion well-founded? -> **(a)**, and stronger than the note's three options

The note offers "a depth bound, a well-foundedness check in the certify walk, or nothing." **None is needed**, under one condition.

**Content addressing makes a protocol-digest cycle a hash fixed point.** A protocol's digest is SHA-256 over its canonical bytes (`catalog.go:124`, `bytesSHA256V1{}.Derive(bytes)`). For protocol P to name protocol Q and Q to name P, we would need `digest(P) = H(f(digest(Q)))` and `digest(Q) = H(g(digest(P)))`, hence `digest(P) = H(f(H(g(digest(P)))))` — a fixed point of a hash-composed function, i.e. a preimage-strength attack on SHA-256. Self-reference is the degenerate case: E11 built protocol X naming a literal `00...00` and got digest `7a23452f5989...`; for X to name *itself*, the literal would have to equal SHA-256 of bytes containing that literal.

This is a *cryptographic* guarantee, not a procedural one — which matters, because `recursion.go:5-7` explicitly warns against relying on the procedural version: "The current catalog ordering makes cycles unreachable in honest operation; keeping the law here means a rebuilt or directly exercised walk cannot silently rely on that accident."

**Three shipped mechanisms already stack under it:**

1. Protocol creation eagerly resolves every hole type and refuses `unknown-ref` on an unresolvable digest (`protocol.go:141-150`), so a protocol cannot reference a type that does not yet exist.
2. Type creation refuses forward refs and cycles. E11, verbatim off the wire: `kind=unknown-ref sort=absence`, law = **"W4/DAG: refs must resolve to cataloged digests — no forward refs, no cycles, no admission on faith"**.
3. `walkRefGraph` (`recursion.go:11-69`) enforces "flb.type.v1: recursion is banned; every admitted ref graph is acyclic" over the whole reachable ref graph.

**Consequence.** The obligation tree's depth is bounded by the height of the protocol DAG, fixed at authoring time. No runtime bound, no certify-walk change.

**The condition, named honestly.** This holds **only if the child protocol is pinned by digest inside the parent protocol value** (as a `literal` in the hole type, per G2). If the hole instead means "a completed session of whatever protocol the filler names," or if the reference goes through a mutable name, the argument evaporates entirely and a runtime cycle check returns. Note also that `walkRefGraph` would *not* catch it: a protocol digest embedded as a `literal` string is invisible to the type-ref walk, which only follows `{"k":"ref"}` nodes. So the safety here comes from hashing, not from the shipped recursion ban — and the recursion ban must not be cited as if it covered this case.

`recursion.go` records the pre-ratified escape hatch if a genuine recursive consumer ever appears: "the Unison SCC rule: hash the SCC, order members by cycle-removed hashes, and address digest.n."

**Literature corroboration.** Demangeon and Honda's strongest completion property buys itself out of recursion by side condition, not by construction: "(Coherence) If P is unblocked and Γ ⊢ P ▷ Δ such that Δ is simple, and moreover Δ does not contain recursions, then there exists P' s.t. P ->* P' and Γ ⊢ P' ▷ ∅." Our position is not more expressive than theirs; it is more *mechanical* — recursion is excluded by the identity scheme rather than by a well-formedness proviso.

---

## G6 — Does authority delegate? -> **(c)**, on a floor that is currently absent

**Opening requires no authority at all.** `protocolSessionOpenRequest` has exactly three fields — `Protocol`, `Bindings`, `Predecessor` — and no principal (`protocol_session.go:25-29`). The journaled open event carries no `Principal` either (`protocol_session.go:140-144`). Anyone who can reach the subject can open any session claiming any bindings; my probes bound principals `"b9"`, `"o9"`, `"c1"` with no ceremony whatsoever. This compounds the already-named gap: seat bindings are bare strings with no principal authentication.

**But opening is convergent, not exclusive** (E7):

```
second open by a different caller        (same session key)
SAME SESSION (open is idempotent)        true
open with different bindings             (different session key)
different bindings => different session  true
```

Open is content-addressed and idempotent — the daemon does not re-append if the fold already exists (`protocol_session.go:157-167`). So **"who may open the child" is not a race; it is a naming question.** The acts that carry authority are `fill` and `close`, which do check seats (`principalSeat`, `protocol_session.go:207-215` and `:300-307`).

The real question therefore reduces to: does the parent's binding of seat S constrain the child's bindings?

| Option | Cost | Reversal |
| --- | --- | --- |
| **(i)** Freeze the child's bindings as literals in the parent hole's type | the child's principals are fixed at parent-authoring time; a builder seat cannot bind its own workers, which is precisely the use case the note names | cheap — it is a hole type; a new digest |
| **(ii)** Add a parent-seat -> child-seat map as a new `flb.protocol.v0` field | a *second* in-place grammar cutover weeks after DEV-675's; the DEV-670 corpus would freeze it | expensive — the wall freezes the semantics |
| **(iii)** Leave the child's bindings free; the certificate carries them; the hole type checks their shape | delegation is honor-system layered on honor-system | free |

**Recommendation: (iii), explicitly and temporarily.** With no principal authentication anywhere, (i) and (ii) would be security theatre over bare strings — they would encode a constraint that nothing enforces, and the estate's honesty ladder forbids claiming a guarantee the mechanism does not deliver. Revisit when principals become real.

**Close authority.** `definition.Close` is a declared any-of seat list (`protocol.go:220`) checked at serve and again at replay. The child's close authority owes the parent nothing today and there is no mechanism to make it owe anything. Making it a function of the parent's is (c) and is downstream of the same missing floor.

**Prior art, and what it has that we lack.** Demangeon and Honda realise subprotocols as **subsessions** with two invitation channels: "one agent creates a new private session, inviting roles of the parent session (*internal invitations*) as well as other agents from the network (*external invitations*). Uninvited participants of the parent session do not have access to the subsession, allowing one to model private interactions inside public sessions." That is option (ii) with teeth: "invitations to a subsession are sent *inside the parent-session*, targeting a specific participant through a linear channel. This extends the existing session-calculi where invitations are always done externally, through shared channels."

**The honest gap-naming.** Their unforgeability comes from *linearity of a channel inside the parent session*. We have no channels — coordination is data, and a journal is not linear. So we cannot buy their guarantee by copying their mechanism; we would need a principal identity the daemon can check. Their result establishes that parent-constrained child participation is *specifiable and sound*; it does not establish that it is achievable in a channel-free, journal-only substrate.

---

## G7 — What does revision do to the pin? -> **(a)**, and it corrects the note's instinct

The note's instinct is "pin to head." The head is provably the wrong field.

**The shipped pin is to the final-state digest, not the head** (`protocol_session.go:20-23`, `:464`). And `protocolFinalStateDigest` excludes the head deliberately: "never the journal head, which would be circular" (`protocol_step.go:367-368`).

**The head of a closed session keeps moving; its digest does not** (E8):

```
head BEFORE receipt   5b8a5c76f2dbc2fcb0d2b885ae65eb40...
head AFTER  receipt   1bea78457d5c8f8a9b541cc7afe1be8a...
final_state_digest BEFORE  e46e0d60eff5beb166203875b0592ac3...
final_state_digest AFTER   e46e0d60eff5beb166203875b0592ac3...
VERDICT   head moved=true  digest moved=false
```

And the pin still validates afterwards (E6/P4: "predecessor after evidence receipt -> ADMITTED"). A head pin would have staled on a post-close evidence receipt — an event that changes no meaning whatsoever.

**So the correct statement of the instinct is: pin to the final-state digest; successor rounds are new fills.** Immutable, honest, possibly stale — exactly the properties wanted, under the right noun.

**Does a successor round of the child stale the parent's fill?** No, mechanically. A successor is a *different session*: its open event differs (it carries `predecessor`), so its content-addressed key differs (E7 establishes the key is a pure function of the open event), and it has its own final-state digest. The parent's fill still names the exact closed round it named. The staleness is semantic, not mechanical, and is precisely the semantic-gap cap the estate already carries ("recomputability of what was built, never fidelity to intent").

**The residual, named.** The pin does not cover the post-close evidence tail (E8: recomputing from the current fold gives `15726cce...` against the pinned `e46e0d60...`). Small **(c)**: accept it (evidence federates; meaning is what the pin promises), or extend the digest domain to cover the tail — which would make the pin move after close, defeating its purpose. I recommend accepting it and *writing it down*, because an unwritten boundary here reads as a defect on first discovery.

---
## G8 — What must the gauntlet probe? -> **(b)**, and the lift is killed mechanically

**What exists.** `runRepairK_perm` (`Model.lean:1806-1810`): "the total runner's terminal state — meaning and journal both — is invariant under permutation of any fill/dispute bag." `SpecL2`/`SpecL3`/`SpecL4` instantiate it (`Spec.lean:45-60`), discharged in `SpecProofs.lean:29-53`. On the TS side, `sessionDigest` (`packages/moves/src/wire.ts`) is a function of the intent bag alone. **There is no digest in the Lean model at all** — the "one-state-digest invariant" is a TS-side derived object and a Go-side close-time object (`protocolFinalStateDigest`), and the two are different functions of different things.

**The lift fails, and I killed it rather than argued it (E5).** I built a gated runner in which a fill's admission consults an external predicate ("has this child closed yet?") which becomes true partway through the bag. Same bag, two orders:

```
order1 impl = {"tag":"open"}
order2 impl = {"tag":"filled",...}
  meaningEq under permutation:              false
  pure kernel meaningEq for the same bags:  true
```

The reason is exact: `runRepairK_perm` rests on `repairK_comm` (`Model.lean:1789`), which rests on `cellApply_comm` — the claim that a move's effect is a function of the hole's cell alone. A child-closure gate is not a function of the cell, so the hypothesis is gone and nothing survives it.

**The daemon's own claim has the same caveat, in writing.** `VERIFICATION.md`: "the permutation property quantifies only over multisets giving each seat at most one distinct value — the honest convergence domain under `successor-round`, where no refusal can fire in any order." A sub-session gate introduces a refusal that fires in some orders and not others. It exits the stated domain by construction.

**The smallest new theorem: monotone-gate confluence.** The journal store and catalog are both append-only — `commitValue` never deletes (`catalog.go:113-167`), journals only append — so the gate predicate is *monotone*: once a child is closed, it stays closed. Under monotonicity plus a fairness assumption (every absence-refused move is eventually retried), the set of eventually-admitted moves is permutation-invariant. Shape:

```
∀ l₁ l₂, l₁.Perm l₂ → Monotone G → FairRetry → MeaningEq (gatedRun G l₁) (gatedRun G l₂)
```

It extends `Moves.Model`'s `repairK_comm` / `runRepairK_perm`, but it needs the session-status layer (`Moves.Wire`, per `scratch/dispatch/24-ref1-wire-model-spec.md`) to define "closed."

**Flag the change of kind.** This converts a *safety* claim (any order, same answer) into a *liveness* claim (eventually, same answer, if you retry). `verify/moves`'s stated bounds are "single journal, no crash/CAS/liveness" (`VERIFICATION.md`). Adding a liveness obligation to the confluence family is a genuine expansion of what the model must model, not an extra lemma — and it should be pre-registered as such rather than discovered mid-proof.

**What the gauntlet must probe, concretely.**

1. Child closes *after* the parent's fill attempt (the E5 shape, on the real daemon).
2. Parent closes while a child is still open — today this is permitted and unremarked; the parent's hole simply records whatever certificate it was handed.
3. Two parents pinning the same child (should be fine — a pin is a read — but unverified).
4. **The fence choosing an unresolvable certificate over a real one.** E9 shows this happens today and no law prevents it.

**Honest status of the instrument.** There is no session-tree gauntlet. `docs/gauntlet/` contains the effector crash-storm (G1) and the R1/R2 climbs; the effector and workflow-replay claims are archived at `archive/pre-estate-focus`. So G8's "what must the gauntlet probe" is a specification for an instrument that does not exist for this object.

---

## G9 — Does it stay one kernel? -> **(a)** yes, with one cost that must be pre-registered

**The line is already drawn in the code.** `protocol_step.go:1-7`: "every semantic branch on hole state, session status, close outcome, or digest lives in this file... A semantic switch on these facts anywhere else is a review failure." And `protocol_step.go:245-252` names the split explicitly: "The caller owns the impure half — catalog resolution for open..., hole existence, seat derivation, and value conformance for fill, declared close authority for close — and every semantic outcome here is decided by the two kernels."

**Catalog access at fill time is already in the impure half.** `checkCatalogedValue` is a `*Daemon` method (`value_check.go:12`) that calls `d.catalog.resolveFact`, and recurses through `ref` nodes resolving further digests (`value_check.go:113-115`). The fill kernel `protocolFillStep` never sees the catalog: its signature is `(revision, status, current protocolHoleFold, value any, valueBytes []byte, seat string)` — no daemon, no store. So **a sub-session check that needs the journal goes exactly where catalog resolution already goes**, and `validatePredecessor` is the shipped template for journal access in the impure half.

**Purity is preserved iff the check is a pre-kernel gate.** And E1 shows this is forced, not merely preferred: `d85Refusal` returns `false` for **every** fill at **every** hole state —

```
willAdmit(open,     fill ...) = true
willAdmit(filled,   fill ...) = true
willAdmit(disputed, fill ...) = true
willAdmit(decided,  fill ...) = true
```

— because fills are total under repair (`Spec.lean:31`, `D85Refusal ... | .fill _ _ _ => False`). **The calculus cannot refuse a fill.** So the sub-session check is not expressible inside it even if one wanted it there. The one-kernel discipline survives by construction.

**The cost, stated.** Moving the check outside the kernel preserves the seam's purity and forfeits the theorem's coverage. `spec_refusal_iff` (`Spec.lean:63-64`) pins refusal to `D85Refusal` as an iff, and that is exactly what makes `willAdmit` "a complete prediction pinned to the runner by theorem, not a heuristic." With a sub-session gate, **`willAdmit` silently stops being total**: it would predict admission for a fill the daemon will refuse. Since `willAdmit` is the flagship instance of the universal-properties-to-DX rule, degrading it quietly is worse than degrading it loudly. The gate must be exposed as a *second, separately typed* prediction (`willResolve(certificate) -> bool | absence`), so the composite prediction is `willAdmit ∧ willResolve` and neither claim overreaches.

**A new coupling nobody has named: parent replayability depends on child retention.** `applyProtocolEvent` re-runs `checkCatalogedValue` on every stored fill during replay (`protocol_session.go:419`). A sub-session gate must be re-run there too, for the same anti-drift reason. But then replaying a *parent* journal requires the *child* journal to still be present and foldable. Retention today: open = `irreducible`, fill = `compactible`, close = `never-discardable` (`protocol_session.go:143`, `:254`, `:317`). A child's close survives compaction, but `replayProtocolSession` folds the whole journal and needs the open plus the fills to reconstruct the fold the close digest was derived from. **Compacting a child would make its parents unreplayable.**

This is latent, not live: `sessionCompaction` currently refuses outright — "G4: session compaction refuses until structural refusals can be sealed into the refusal corpus" (`session.go:774-783`). But it is a constraint the sub-session hole would silently place on the compaction design, and the compaction lane should learn about it before it ships rather than after.

**A mitigation worth grilling separately.** If the certificate carries `(protocol, bindings, predecessor, final_state_digest, outcome)`, replay could verify the *derivable* half (the session key, per E7) with no journal access at all, and treat the digest half as a fill-time-only obligation recorded in the journal. That would keep replay journal-local. Whether a check that is strong at fill time and weak at replay time is acceptable is a real question and I am not resolving it here.

---

## Prior art

Searched 2026-08-16 via WebSearch and WebFetch. Terms: *multiparty session types subsession nested delegation Honda Yoshida*; *"nested protocols" multiparty session types Demangeon Honda subsession*; *content-addressed workflow sub-workflow completion certificate digest verifiable parent child provenance*; *nested CRDT composition convergence hierarchical strong eventual consistency proof*; *session types subsession delegation authority "who may open" child session security*.

### On point — confirmed against the primary source

**Demangeon, R. and Honda, K., "Nested Protocols in Session Types", CONCUR 2012, LNCS 7454, pp. 272-286.** Retrieved 2026-08-16 from `https://mrg.cs.ox.ac.uk/publications/nested-protocols-in-session-types/subsessioncam.pdf`; text extracted locally with `pdftext.ts` into `demangeon-honda.txt` (40,601 bytes). Quotations below are from that extraction (the PDF's font encoding drops fi/fl ligatures, so e.g. "definition" appears as "denition"; I have not silently repaired quoted text beyond re-spacing).

What the paper establishes:

- **The primitives.** "The new primitives addressing protocol stratification are `let` and `calls`." A `let` declares an auxiliary protocol; `calls` invokes it, and "through a call, arguments can be passed, such as values, roles and other protocols, allowing higher-order description."
- **Well-formedness is enforced by kinds — "types for types":** `K, S ::= Role | Val | ⋄ | (K₁ × ... × Kₙ) → K`.
- **The soundness result is Proposition 3**, with four parts: *Correspondence*, *SubjectReduction*, *Progress* ("If P is unblocked and Γ ⊢ P ▷ Δ such that Δ is simple, then there exists P' s.t. P ->+ P', Γ ⊢ P' ▷ Δ' and Δ' is coherent"), and *Coherence* (quoted under G5, conditioned on Δ containing no recursions).
- **Results flow back by a dedicated mechanism**, added as an extension: "The syntax of global types with results adds `r returns (res : S)` and `(res : S) <- r calls P<e_r; e_v>` (replacing `end` and `r calls P<e_v>`)... Kinds ensure that the returned result has the type expected by the initiator."
- **Subsessions run concurrently by default; the result mechanism is what synchronises**: "In the framework presented above, subsessions are executed in parallel with the parent session. The result mechanism allows one to include synchronisation between the two sessions."
- **Authority is delegated by invitation, over linear channels inside the parent** (quoted under G6).
- **Their own stated limitations**, which map onto ours: "Currently, the result is sent to the initiator. Broadcasting the result to every member of the subsession might also be a desirable feature. Moreover, our results are restricted to value-types, but some use cases of [15] specify that a negotiation subprotocol produces a contract that is used in the parent protocol..."
- They contrast with **Scribble**, where subprotocols "only correspond to the in-lining mechanism" — i.e. macro expansion, not a first-class sub-session.

**What their model shares with ours:** a hole/obligation in the parent discharged by a child's completion; a typing discipline that rejects ill-formed calls before runtime; a completion guarantee conditioned on non-recursion.

**What our evidence-union + fence model changes, stated as differences not improvements:**

| | Demangeon-Honda | This estate |
| --- | --- | --- |
| Child result | a value sent to the initiator over a channel; typed by kinds | a certificate *pinned by digest*, re-derived by journal replay; the child's terminal state is a content-addressed value that anyone holding the journal can recheck |
| Synchronisation | the `returns`/`calls` pair blocks the initiator | nothing blocks; the parent hole can be filled at any time and the gate is a refusal (E5) — which is exactly why their Progress theorem has no analogue here |
| Conflicting fills | not a concept — a channel carries one value | the parent hole becomes `disputed` and a declared fence adjudicates (E9); disagreement about *which child discharged the hole* is first-class data |
| Recursion | excluded by a well-formedness side condition on Δ | excluded by hash-preimage infeasibility (G5) |
| Authority | linear invitation channels inside the parent session make delegation unforgeable | no channels, no principals; delegation is currently unenforceable (G6) |
| Failure | exceptions named as future work: "we believe that nested protocols give a simple way to handle exceptions, by making explicit blocks of computation" | an `abandoned` child is a *legal, pinnable value* today (E6/P6, G2) |

The last row is the sharpest genuine advance and it is already shipped: their framework treats subprotocol failure as an open problem; ours produces a final-state digest for an abandoned round and lets the parent hole's declared type decide whether to accept it.

### On point — for the tree-convergence question

**Gomes, V. B. F., Kleppmann, M., Mulligan, D. P., Beresford, A. R., "Verifying Strong Eventual Consistency in Distributed Systems", PACMPL 1(OOPSLA), Article 109, October 2017.** Retrieved 2026-08-16 from `https://arxiv.org/abs/1707.01747` (abstract page only). Establishes an Isabelle/HOL framework with "an abstract convergence theorem... a property of order relations, which provides a formal definition of strong eventual consistency," with machine-checked results for three concrete CRDTs.

Relevance: our `runRepairK_perm` is a strong-convergence statement of the same family, and the monotone-gate theorem G8 needs is the standard SEC decomposition — strong convergence (safety) plus eventual delivery (liveness). **I did not read the paper body**, so the precise commutativity hypotheses of their abstract convergence theorem are a **LEAD**, not confirmed; anyone building the G8 theorem should read sections 3-4 before assuming their framework transfers.

### Absence, reported as a finding

**No prior art found** combining (a) a hole discharged by a *completed sub-session*, (b) *evidence-union with dispute* semantics on the parent hole, and (c) a *content-addressed* completion certificate re-derived rather than asserted — having searched the five term sets listed above. The content-addressed-workflow searches returned adjacent work only: C2PA content credentials (parent/component/input ingredient relations), blockchain workflow-node certification patents, and hash-chained execution provenance. None of these carries a typed hole, a fence, or a dispute; presenting them as on-point would be padding. The session-types literature has (a) without (b) or (c); the CRDT literature has the convergence machinery without any notion of a typed obligation.

---

## Gaps this lane could not establish

1. **I did not build the sub-session hole.** Every "would" in this report is a claim about how shipped code would compose, grounded in probes that stand in for the real thing. E4's fabricated-certificate result is the closest thing to running the real object, and it runs the *type* half only.
2. **I did not read the Demangeon-Honda paper's typing rules or proofs**, only the extracted prose. The primitives, kind grammar, and Proposition 3 statement are quoted from my own extraction of the primary PDF; the *rules* that make them sound are unread. The extraction also drops ligatures and mathematical symbols, so any quotation should be re-checked against the PDF before it appears in a ratified document.
3. **I did not read the Gomes et al. paper body**, so the claim that their abstract convergence theorem transfers to our setting is a lead only.
4. **The monotone-gate confluence theorem is stated, not proved, and not even formalised.** I have not checked that the fairness assumption can be stated in `Moves.Model`'s idiom, nor that the proof goes through — only that the *unfairness* counterexample exists (E5).
5. **I did not measure the cost of journal-replay-per-fill.** `validatePredecessor` replays the child journal from `Seq: -1`; under a sub-session hole this happens on every fill *and* on every replayed fill. For a deep tree this is potentially quadratic-or-worse, and I ran no benchmark. `scratch/dispatch/24-ref1-wire-model-spec.md` pins the kernel-state footprint as journal-free precisely so it "cannot grow with session length" — a sub-session gate that replays journals sits in tension with that and I did not resolve it.
6. **I did not check whether the daemon's per-session mutex composes across a parent/child pair.** `serveProtocolSessionFill` holds `stored.mu` for the parent while it would need to take the child's lock inside `validatePredecessor`-style resolution. `VERIFICATION.md` already records "the per-session mutex is never raced by a test." A parent->child lock order is a deadlock surface I identified but did not exercise.
7. **The G3 misclassification finding is from reading and probing one code path.** I did not audit every refusal site for the same structural/absence confusion.
8. **Cross-venue was reasoned from doctrine, not measured.** I ran a single daemon throughout. Nothing here tests two daemons, journal mirroring, or divergent catalog heads.

---

## Recommendations

Each with its cost and what reversal takes.

**R1. Fix the G3 misclassification before anything else.** Split `validatePredecessor`'s refusal: `digest-mismatch`/structural when the digest does not match a *closed* fold; a new absence-sorted refusal when `status != "closed"`.
*Cost:* one new refusal kind, which means a new `RefusalSortGrammarDigest` (`refusal.go:23`) and a re-pin of every archived-refusal reader. Adds nothing to the trusted base.
*Reversal:* the digest re-pin has to be redone; the code change itself is trivial.

**R2. Pre-register `willAdmit`'s degradation before building any gate.** Declare now that the sub-session check produces a second, separately typed prediction, and that the composite is `willAdmit ∧ willResolve`.
*Cost:* every agent loop that today asks one question must ask two; the veneer SDK's pre-flight surface widens.
*Reversal:* free before the gate ships; expensive after, because consumers will have been written against a total `willAdmit`.

**R3. Pin the child protocol by digest in the parent protocol value, as a `literal` in the hole type.** This is what buys G5 for free and what makes G2's conformance check real.
*Cost:* a parent protocol can name only child protocols that already exist. Authoring becomes bottom-up. Adds nothing to the trusted base.
*Reversal:* free — hole types are values; a different pinning mints a different digest.
*Do not* claim `walkRefGraph` covers this: a protocol digest inside a `literal` is invisible to the type-ref walk. The guarantee is hashing, and the comment that ships with it must say so.

**R4. Adopt option (iii) for delegation — child bindings free, carried in the certificate — and write down that it is provisional.**
*Cost:* delegation is unenforced. The compensating discipline is that it is unenforced *visibly*, in a named gap, rather than encoded as a constraint nothing checks.
*Reversal:* free; (i) and (ii) remain available once principals exist.

**R5. Land the session-status layer in `Moves.Wire` before attempting G4's or G8's theorems.** `status`, `outcome`, `sealed`, and the completion arithmetic do not exist in Lean, so neither theorem can currently be *stated*, let alone proved.
*Cost:* the two theorems wait on REF-1. Adds the session layer to the model's surface, which is more to maintain (`docs/research/2026-08-16-rq8-proof-maintenance.md` is the relevant lane).
*Reversal:* the layer is wanted anyway per `scratch/dispatch/24-ref1-wire-model-spec.md`; this recommendation only orders the work.

**R6. Tell the compaction lane about the parent-replayability coupling now.** Compaction refuses today (`session.go:774`); it should not be designed in ignorance of a hole type that makes a child's journal load-bearing for its parents' replay.
*Cost:* a constraint on a lane that has not started. Nothing to the trusted base.
*Reversal:* free now; very expensive if compaction ships first and sub-session holes are retrofitted.

**R7. Do not let a fence adjudicate between certificates until the gate exists.** E9 is the concrete hazard: a seat-authority fence decided a parent hole for a certificate naming a session that has never existed, and the parent closed `completed`. Either the gate lands before sub-session holes ship, or single-seat sub-session holes ship first (no fence, no dispute, no adjudication between unverified claims).
*Cost:* single-seat holes forfeit the dispute machinery that is the estate's differentiator, for this hole type, until the gate exists.
*Reversal:* free — widening a hole's seat list is a new protocol value.

---

## Sources

**Repository (read 2026-08-16, branch `agent/codex/kernel-hygiene-gates`).** Paths are relative to `C:\Users\kokok\Dev\foldlab`.

- `proto/go/protod/protocol_step.go` — the pure step seam; `protocolFillStep` (:121), `protocolCloseStep` (:203), `protocolSessionTransition` (:253), `fenceChoice` (:349), `protocolFinalStateDigest` (:369).
- `proto/go/protod/protocol_session.go` — `protocolPredecessor` (:20), `serveProtocolSessionOpen` (:102), `serveProtocolSessionFill` (:174), `applyProtocolEvent` (:389), `validatePredecessor` (:450).
- `proto/go/protod/value_check.go` — `checkCatalogedValue` (:12), `checkValue` (:26), literal comparison by canonical bytes (:51).
- `proto/go/protod/protocol.go` — the `flb.protocol.v0` grammar; hole-type catalog resolution (:141), `completionExpectation` (:216), `closeExpectation` (:220).
- `proto/go/protod/refusal.go` — `RefusalSort` (:11), `RefusalSortGrammarDigest` (:23), kind-to-sort table (:48).
- `proto/go/protod/recursion.go` — `walkRefGraph`, the acyclicity law and the pre-ratified Unison SCC successor.
- `proto/go/protod/catalog.go` — `resolveFact` (:103), `commitValue` (:113), W1 digest re-derivation (:124-131).
- `proto/go/protod/read.go` — `lookupJournal`, "lag is absence" (:141).
- `proto/go/protod/session.go` — retention tiers (:22-24), `sessionCompaction` refusal (:774).
- `proto/go/protod/concierge.go` — `buildFrontier` (:130); the frontier is over `flb.type.partial.v0`, not protocol sessions.
- `proto/go/protod/protocol_moves_test.go` — `bootstrapProtocol` (:53), `TestProtocolBindingsCloseAndPredecessorAreAuthoritative` (:385).
- `packages/moves/src/kernel.ts` — the E2 kernel; `step` (:196), `repair` (:244), `d85Refusal` (:304), `close` (:362), `merge` (:413).
- `packages/moves/src/wire.ts` — `digestState`, `sessionDigest`.
- `verify/moves/Moves/Spec.lean` — `D85Refusal` (:30), `SpecL2` (:45), `SpecL5` (:63), `SpecL8Stable` (:77).
- `verify/moves/Moves/SpecProofs.lean` — `spec_meaning_confluent` (:29), `spec_refusal_iff` (:55), `spec_decided_stable_total` (:86).
- `verify/moves/Moves/Model.lean` — `repair` (:328), `decided_stable` (:1460), `repairK_comm` (:1789), `runRepairK_perm` (:1808), `repairK_decided_stable` (:1828), `no_fair_resolute_fence` (:1948).
- `VERIFICATION.md` — the E2 claim row (:44); protocol-session bounds and the permutation-domain caveat (:551-556).
- `SLICE.md` — seam statuses; S1 walled-weak (:25), S7 walled (:31).
- `scratch/dispatch/21-the-use-catalog.md` — the proposal and G1-G9 (section 7); E4 on journal mirroring.
- `scratch/dispatch/24-ref1-wire-model-spec.md`, `scratch/dispatch/17-the-refinement-ladder.md` — where the session layer lands in Lean.
- `docs/gauntlet/` — the effector crash-storm and R1/R2 climbs; no session-tree instrument.

**Literature.**

- Demangeon, R., Honda, K. "Nested Protocols in Session Types." CONCUR 2012, LNCS 7454, 272-286. PDF retrieved 2026-08-16 from `https://mrg.cs.ox.ac.uk/publications/nested-protocols-in-session-types/subsessioncam.pdf`; text extraction in `demangeon-honda.txt`. DOI 10.1007/978-3-642-32940-1_20.
- Gomes, V. B. F., Kleppmann, M., Mulligan, D. P., Beresford, A. R. "Verifying Strong Eventual Consistency in Distributed Systems." PACMPL 1(OOPSLA):109, October 2017. Abstract retrieved 2026-08-16 from `https://arxiv.org/abs/1707.01747`. **Body unread — lead only.**
- Honda, K., Yoshida, N., Carbone, M. "Multiparty Asynchronous Session Types" — surfaced in search as the foundational work; **not read**, listed for completeness, no claim rests on it.

**Searched and found nothing on point** (terms and negative result recorded under "Prior art -> Absence").

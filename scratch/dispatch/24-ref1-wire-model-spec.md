# REF-1 — the concrete wire model, Moves.Wire (executor spec)

Status: spec draft by the coordinator, 2026-08-16, under post-sweep
ruling 4; operator sign-off required before dispatch, and the build
dispatches only at DEV-670 close (its executable mapping is what
this slice promotes). Slice charter: draft 17 §REF-1. Evidence base:
RQ-8 (`docs/research/2026-08-16-rq8-proof-maintenance.md` +
addendum) for structure; RQ-7 for the journal constraint.

## Objective

Formalize the actual wire surface in Lean — session state, wire
operations, close status — with the translation to and from the
abstract calculus, so REF-3 can state the refinement equation

    translate (wireStep s op) = modelStep (translate s) (translate op)

over it. DEV-670's executable mapping is **promoted, not
rewritten**: after this slice the corpus generator consumes the
formal objects, and the promotion is proved harmless by byte-identical
corpus regeneration.

## Spec-fixed decisions (ruled; the executor edits none of these)

1. **Home: a `Moves.Wire` namespace inside the existing verify/moves
   Lake package** (ruling 4, on RQ-8's measured evidence: cold build
   11.4 s, Model.lean edit 4.06 s — isolation buys nothing; and D-e
   obligation 1 wants the refinement equation footprint-clean in the
   same `#print axioms` sweep as the abstract laws).
2. **The kernel-state footprint excludes the journal** (ruling 4).
   The model distinguishes the daemon's full session reality from
   the footprint the theorems quantify over: holes, seat bindings,
   committed/disputed candidate sets, close status. How `Moves.Wire`
   factors the two (a `KernelState` projection of a fuller
   `WireState`, or journal-as-host-observation from the start) is an
   executor decision recorded in DECISIONS — constrained hard by:
   the REF-3 equation quantifies over the journal-free footprint,
   and nothing in the footprint may grow with session length.
3. **The journal records canonical opBytes** (ruling 4, RQ-7): each
   operation is journaled as the canonical bytes the kernel saw,
   never a friendlier rendering — a third party replays from journal
   + kernel alone, and reversing this later means rewriting journals.
   The model declares this as the journal's type; enforcement in the
   daemon is REF-7's cutover, not this slice.
4. **Layer partition gated** (roster, RQ-8): definitions, law
   statements, and proofs in separate files; a check fails when a
   law file is orphaned from the gate. Statement files are
   Rev-frozen and sha256-pinned per house pattern when REF-3 lands;
   this slice lays the file structure that makes that pin possible.
5. **The grammar is the merged, narrowed one** (ruling 2 /
   brief 21): no float leaf exists; integers ride Lean `Int`/`Nat`.
   The model never restates the grammar by hand — it imports or
   mirrors the promoted DEV-670 objects, and any mirror is
   regeneration-gated.
6. **Hygiene inherited by construction** (brief 22, same package):
   no `panic!`/`partial`/`sorry` in `Moves.Wire`; no
   `@[implemented_by]`; no non-allowlisted `@[extern]`.

## Academic grounding (determination 2026-08-17, rulings 8/10)

The model is built as what it provably is: a join-semilattice of
holder-attributed observations (a CvRDT, Shapiro et al. 2011) over
an op-shaped wire, arbitration declared as a protocol constant
(Burckhardt et al., POPL 2014), close as the CALM-mandated
coordination point. Consequences binding on this slice:

1. **No network layer, as a licensed decision.** The Gomes et al.
   Isabelle framework's network axioms are discharged by
   construction and the closing tour says so, axiom by axiom:
   `delivery_has_a_cause` (one writer appends; verify-on-read
   re-derives digests), `msg_id_unique` (content addressing;
   uniqueness = collision resistance, already in the trusted base),
   `deliver_locally` (one journal; the appender reads it),
   `causal_delivery` (vacuous: `repairK_comm` commutes ALL wire-move
   pairs, so no delivery order is privileged), `histories_distinct`
   (CAS append; idempotent union). What stays outside and named:
   the client↔daemon transport, mirroring, and every bound
   VERIFICATION.md already lists.
2. **The partition is field-precedented**: Gomes et al. factor
   abstract convergence / network / instantiation and attribute
   their reuse to it; the gated definitions/laws/proofs partition is
   the same discipline in Lean.
3. **Total function, never simulation, never `Option`.** The
   equation form is the dividend of daemon totalization
   (DEV-671/674/675); simulation relations (Burckhardt's
   replication-aware simulation, seL4's forward simulation) are what
   nondeterministic implementations pay, and a partial step (Gomes's
   `interp ⇀`) drags a no-failure side obligation through the whole
   development. Refusal is a value. `Option` at the step seam, or
   any `termination_by`/fuel apparatus, is a spec smell to report —
   nothing in the wire surface is unboundedly recursive.
4. **The REF-4 bridging lemma is named now, built later**:
   `statusOfJournal j = s.status` as an invariant of lawful runs
   (status stays a state field per the footprint ruling; the lemma
   is REF-4 material — the executor leaves its seam, builds none of
   it).
5. **Reserved seam, barred theorem**: the layout may leave room for
   a future gated run (child-closure), but stating any gated-run
   theorem is refused in advance — ruling 10 pre-registers that a
   fair-retry premise moves the confluence family from safety to
   liveness, exceeding the ledger's stated bounds until ratified.

## Scope

Session state and wire operations for the fill/dispute fragment plus
close STATUS (close semantics — seal, fence, record, digest — remain
REF-4's; this slice gives them a place to land, not a meaning);
translation functions both directions; the typed divergence
enumeration compiling as the formal exception set with its count
pinned. No theorems about the daemon are claimed — this slice builds
the objects REF-3 quantifies over.

## Gates (mechanical)

- `lake build`; no `sorry`; footprint check extended to
  `Moves.Wire`; partition check green.
- The DEV-670 corpus **regenerates byte-identically** from the
  promoted objects — the promotion changed nothing, proved by bytes.
- The divergence enumeration compiles with its pinned count
  unchanged (post-DEV-670 expectation: empty on the open-session
  fill path — any growth is a finding, not an annotation).
- `bun run gates` and `bash verify/moves/run.sh` green, hygiene
  gates included; S7 wall green throughout.
- Negative control: one planted mistranslation (a wire op mapped to
  the wrong abstract move) refuted by the regeneration gate, trace
  committed.

## Blockers

DEV-670 merged (the executable mapping and corpus this promotes);
the brief-21/22 branch merged (grammar + hygiene gates). Sign-off on
this spec is the dispatch trigger once both land.

## Non-goals

No refinement equation (REF-3), no close/digest semantics (REF-4),
no canonicalization law (REF-2a), no extraction, no daemon changes.

## Closing report extra

Alongside the standard board report: a short guided tour of
`Moves.Wire` for the operator — what each file states, where the
translation lives, how a wire op walks through it — written for a
reader learning Lean, glossing every piece of notation used. The
estate's education rule applies: this namespace is machinery the
operator will be asked to ratify extensions of, so it must be
legible to them from its first commit.

Seats: Eng builds on `agent/<name>/<issue>`; Rev reviews; operator
ratifies and merges. DECISIONS log per house rule. The issue body is
this spec.

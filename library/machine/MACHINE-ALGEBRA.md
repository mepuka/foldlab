# MACHINE-ALGEBRA — the general conformance machine (DRAFT for grilling)

Status: staged design proposal, 2026-08-25 — no claim gate satisfied. This is the
algebraic model of the general machine the operator named ("a general parameterized
metaprogrammed code generator … that could materialize well-formed codebases"), with
the schema store as the dogfooding instance throughout. Every soundness word below
either links a proved theorem (LEDGER row, cited as `⊢`) or is marked **owed**. The
document decides nothing; it is the grilling input for scoping the machine as a
program. Notation: `Bytes = List UInt8`; `Addr` = digest values; `⇀` finite partial
map.

---

## 1. The parameter: a Kind

A **kind** is the septuple the estate already owns five-sevenths of (STORE-MODEL §2's
quintuple + joint B's `refs` + §5's admission judgment):

```
K = (C, ≈, canon, ser, refs, WF, tag)

  C     : Type                 inductive carrier; no functions anywhere in it
  ≈     : C → C → Prop         declared equivalence; compositional per constructor —
                               the clause menu IS the constructor menu; widening it is
                               a new scheme version, never an amendment
  canon : C → C                respects AND reflects ≈; idempotent
  ser   : C → Bytes            framed (discriminator byte per node, unbounded length
                               frames); injective on canonical forms
  refs  : C → List (Σ K', Addr)   typed outgoing references: each slot declares the
                               kind it expects (generalizing schemaTyped)
  WF    : C → Prop             decidable admission, clause-named (the rejection
                               vocabulary is part of the kind)
  tag   : UInt8                the kind's namespace byte
```

Pre-image and address are then **derived, never chosen**:

```
pre_K(c)  = versionByte ∷ tag_K ∷ ser(canon c)
addr_K    = H ∘ pre_K
```

**Dogfood.** K_S = (SchemaCore, ≈ per KICKOFF §4.3, canonS, encSchema, refsS, WFS,
0x01-plane schema tag) and K_E = ((Addr × Value), …, canonV-lifted, encValue-framed,
refsV + the schema slot, dupFreeV-plane, entity tag). Both fully instantiated;
receipts in §9.

## 2. Namespaces

Three nested namespace mechanisms, each with its separation obligation:

1. **The version byte** — the *scheme* namespace. Obligation: distinct versions have
   disjoint pre-image sets. `⊢ version_byte_separates`, `⊢ version_byte_separates_bump`
   (a bump moves every address out of the scheme's image at once — Unison's untested C4,
   discharged).
2. **The kind tag** — the *kind* namespace inside one scheme. Obligation: tags pairwise
   distinct ⟹ pre-image sets pairwise disjoint (framing makes the second byte
   authoritative). Dogfood: `⊢ kind_separation` (S/E pair); the general form is the
   pairwise lift — **owed as a schema, discharged per pair at instantiation**.
3. **Name planes** — mutable namespaces *beside* the store, per scope; never inside any
   pre-image. Laws: names-inert (M16 — **owed, unstated**; F-account gap), and the
   minted host-relation-neutrality rule: no host string relation, order or equality, is
   ever load-bearing for an observable (F-39's closure is the dogfood receipt —
   hex-encoded name files, both planes injective).

Cross-kind reference typing: `refs` slots carry their expected kind, so reference
closure is kind-aware — "present as bytes" is strictly weaker than "present as the
expected kind" (`schemaTyped`, R3's `C_obstruction`). The general clause: every
reference resolves *to its declared kind*.

## 3. Collisions — the hypothesis lattice on H

`H : Bytes → Addr` is an abstract parameter. Every law is stratified by what it
demands of `H`, and the strata are the machine's honesty budget:

| Level | Hypothesis | Laws living there | Dogfood receipts |
|---|---|---|---|
| **0** | nothing | congruence/Direction A; dedup (a theorem of the encoding, never of the hash); frame/append-only; canon idempotence; kind & version separation at pre-image; acyclicity (`putPre` no-ops on an occupied address — survives even *adversarial* H) | `⊢ directionA, M12, M12E, M13, S1×2, kind_separation, version_byte_*, M10_wf3, M10_rank` |
| **1** | `hInj : Injective H`, always a named premise, never an axiom | Direction B; intra-kind faithfulness on the admissible set; one-kind-per-address lifted | `⊢ intraKindFaithful`; `ObligationDirectionB` stated (a two-liner, flagged) |
| **2** | collision resistance | **never stated** — no theorem in the machine may occupy this level; what a collision actually does is *characterized* instead: the second write no-ops (M10's survival) and commutation's independence premise is forced (`A_collision_drops`) | `⊢ M11_comm` with its forced `H b₁ ≠ H b₂` premise |

The design law this table encodes: **push every law to the lowest level it can
occupy, and characterize rather than assume at the levels above.** A machine
instantiation inherits the table; it never renegotiates it.

## 4. The store algebra over kinds

One store holds all kinds: `Σ : Addr ⇀ Bytes`, pre-image bytes verbatim.

- **Reachable** — the legality construction: per-kind insert rules whose premises are
  judged **on the stored forms** (the (i-a) posture as general law: a judgment judges
  what is held, never what was handed in — F-25's lesson, permanently). Dogfood:
  `⊢ M8, M9, M15×3, M17_typed_reachability` over the restated `Reachable`.
- **Admissible(H, Σ)** — what verification establishes: the conjunction of every
  *decidable* clause (functional, hashed, admitted-canonical, kind-aware closure,
  acyclic). Undecidable judgments are **excluded by law** and ride the transport
  bridge's premise list instead. The decision procedure is a single surface with a
  proved equivalence: `⊢ admissibleReportDecides` — the report's verdict *is* the
  judgment. Machine rule: **one judgment, one decision surface, one iff** (C-3's
  closure, generalized).
- **Transport** — `Admissible Σ → (undecidable residue) → Reachable Σ`: the M19 shape.
  Stated, **owed**; its witness is computed (below).

## 5. The dependency graph is stored, not solved

This is the machine's cleanest property and it is already proved, not designed:

- `refs` edges over addresses **are** the dependency graph.
- Closure (WF2) makes it total; construction makes it a DAG — `⊢ M10_wf3`: no
  reachable store contains a cycle, for arbitrary `H`.
- `topoOrder` (Kahn's) decides acyclicity and **emits the build order**;
  `⊢ topoComplete` (order exists iff acyclic). `TopoSound` as pinned is refuted
  (F-55 — dangling-target edges; restatement is a grill item; the repaired form
  quantifies over bound targets, matching `closed`'s context).
- `⊢ M10_rank`: a reachable store's own insertion order is already reverse-topological.

Consequence: **materialization order = Kahn's order = the build plan.** The machine
never constructs a dependency graph or solves a scheduling problem; it stores
descriptions whose reference structure *is* the plan, and the plan's existence and
acyclicity are theorems. `apply in topoOrder` is the whole build system.

## 6. Vector conformance, and the product question

Per kind, per bundle version:

```
Conform_K(I, B)  :=  ∀ v ∈ B_K :  obs_I(v.in) = v.out
   ⊢Lean  v.out = model_K(v.in)     proved per row (46 theorems at the dogfood; the
                                    emitted files are projections of proofs)
   Test   obs_TS(v.in) = v.out      the station gate
```

**Is the composite a product of service definitions?** Almost — and the correction is
where the rigor lives. The composite is not the plain product `Π_K Conform_K`: the
coupling is real and *byte-level*. Dogfood witness: schema vector S-01's **address sits
verbatim inside** entity vector E-01's pre-image — an entity fiber's vector set is
indexed by the addresses its dependency fibers established. So:

```
Conform(I, B)  =  dependent product over the dependency DAG, evaluated in topoOrder:

    Π_{K in topo order}  Conform_K( I_K,  B_K[ addrs established by deps(K) ] )
```

a **fibered product over the reference structure**, not a cartesian one. Two
consequences fall out:

1. **The ratchet is the lattice of downward-closed sets.** A green set Gₙ is valid only
   if downward-closed in the DAG order (you cannot be green above a red dependency);
   `Bₙ ⊑ Bₙ₊₁` append-only and `Gₙ ⊆ Gₙ₊₁` monotone make (B, G) a climb through that
   lattice; `next(G)` = the least red station with green dependencies — a total
   function whenever the DAG is (which is a theorem, §5).
2. **Service definitions are a kind, not a special case.** K_service: carriers are API
   surfaces (operations, error taxonomies, contract citations); `refs` = the services
   and schemas an interface mentions; `WF` = the admission of the surface. Then "the
   system" is entities at K_service, its dependency graph is stored (§5), and the
   product above *is* the system's conformance. The machine eats its own architecture.

## 7. Materialization

```
Mat : (Σ reachable) → Codebase        generated, never hand-maintained (P4 as law)
```

- **Well-formedness by construction**: every materialized artifact conforms to its
  description — this is typed reachability read one level up; at the dogfood it is
  literally `⊢ M17_typed_reachability` (with its two anti-claims traveling: judgment
  blindness where declared, environment-relativity until M17′).
- **Determinism**: Mat is a function of Σ alone — no clock, no randomness, no host
  relation (the G-S discipline generalized; the gates carry it).
- **Incrementality for free**: content addressing makes Mat's memoization sound —
  identical address, identical output (Level-0 dedup); the ratchet forbids
  un-materializing (a green fixture stays green).
- **The flagship owed theorem** (KICKOFF §16's T-B, now nameable precisely):
  materialization commutes with the generator over the inventory —
  `Mat(put(gen(inv))) = codegen(inv)` up to the declared projection. **Owed**; the
  machine's end-to-end statement.

## 8. The obligation functor — the price of admission

The M-inventory abstracts to a statement *schema* over K; a new kind buys into the
machine by discharging the column, never by negotiation:

| # | Statement schema (at K) | Level | Dogfood discharge |
|---|---|---|---|
| O1 | canon idempotent | 0 | `⊢ S1_canon_idempotent`, `⊢ S1_canon_v_idempotent` |
| O2 | canon respects/reflects ≈ | 0 | stated (M2/M2′) |
| O3 | ser injective on canonical forms | 0 | `⊢ encSchema_inj`, `⊢ encValue_inj` |
| O4 | decode ∘ ser = some (+ rejection of non-image bytes) | 0 | `⊢ M4a×2`; **M4b owed-unstated (gap)** |
| O5/O6 | Direction A / Direction B | 0 / 1 | `⊢ directionA`; M6 stated |
| O7 | kind separation vs every other kind | 0 | `⊢ kind_separation` |
| O8–O16 | store algebra: WF1, closure, dedup, frame, get-put, faithful, names-inert, idem/comm | 0 (comm forces collision-independence) | `⊢ M8 M9 M12 M12E M13 M14 M15×3 M11`; M16 **owed-unstated (gap)** |
| O17 | typed reachability at K's reference slots | 0 | `⊢ M17`; M17′ owed |
| O18 | WF decidable, clause-named, one surface, Decides-iff | 0 | `⊢ wfsB_iff, clause iffs, admissibleReportDecides` |
| O19 | transport (Admissible + residue → Reachable) | 0 | stated; witness computed (`⊢ topoComplete`) |
| O20 | vector corpus: one row per encoder arm + one per clause, rows proved | 0 | `⊢` 46 vector theorems; coverage audited-not-proved (unchecked-claim marker) |

The functor view, informally: obligations are natural in K — instantiation is
substitution into the schemas; nothing about the *shape* of the table is renegotiated
per kind, only discharged. (Naturality itself is a meta-claim: **owed** as prose
discipline, not as a Lean theorem — the estate proves instances.)

## 9. Dogfooding scoreboard (2026-08-25, LEDGER-backed)

E2 gate: 1769 constants · shell gates G-S1..G-S5 · 26 differential scripts, transcripts
golden · 32+6 vectors, 46 vector theorems · ledger byte-compared in CI · full
`mise run check` green. Named gaps carried honestly: M4b, M16, M17′, M19, M6 (two-liner),
D2/D3 placeholder, F-55's TopoSound restatement, R-4 session, R-2 window.

## 10. Grilling agenda

1. **F-55**: restate TopoSound over bound-target edges, or strengthen `Edge`?
2. **K_service's carrier** — the first new kind: what is an API surface's constructor
   menu, and what does its `≈` deliberately ignore?
3. **Bundle algebra**: is `B` a lattice object worth minting (append-only join, version
   = principal ideal), or is prose enough?
4. **The fibered product** (§6): mint "station product" as a term, or leave descriptive?
5. **Where the machine lives**: a new program charter (the KICKOFF pattern) with this
   document as its §1, or an Entity Store §-appendix until K_service is real?
6. **The flagship theorem** (§7): is `Mat`-commutation the right end-to-end statement,
   and which lane owns it?

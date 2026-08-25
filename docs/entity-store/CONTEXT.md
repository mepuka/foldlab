# CONTEXT — the Entity Store context

Status: RATIFIED by grilling 2026-08-25 (operator, in-session, all as recommended;
RULINGS.md R-1 entry) — migration step 2 of ruling W3-6. The promoting act is this
commit; the draft's grilling agenda is resolved in the RULINGS entry. Kind: **glossary**.
This document owns the context's vocabulary and nothing else (D1 authority map).

## R-1, discharged

**The context is named "Entity Store", home `docs/entity-store/`** (the de-facto home;
no files move). **The Lean namespace stays `E2`**, recorded here as the context's code
label — R-1 discharged without the maximal-blast-radius rename, which buys nothing
semantic. STORE-MODEL §7's "working labels until R-1" clause resolves accordingly:
labels stand, minted terms live here.

## Scope

This glossary owns the context's **vocabulary**: minted terms and minted rules. It owns
no behavior (STORE-MODEL/STORE-SHELL), no status (LEDGER), no history (RULINGS). Legacy
model vocabulary (`Reachable`, `WFS`, `canonS`, `Conforms`, kinds S/E, …) remains
defined where it is normative and migrates here progressively at migration step 5 —
move, not copy. Minted now: the wave-3 terms and rules below.

---

## Terms

### Admissible
- **Kind:** model (judgment). **Code label:** `E2.Admissible`, owned by `E2/Admission`
  (W3-3).
- **Carrier / judgment form:** `Admissible : StoreMap → Prop` — the conjunction of
  every *decidable* legality clause: per-object WF1, decode, canonical image,
  well-formedness (schema and value planes), reference closure, schema-typing
  resolution, and acyclicity of the reference graph. Decision procedure:
  `admissibleReport : StoreMap → Report`, per-clause verdicts (what the shell's named
  rejections and `check` consume).
- **Obligations:** `ObligationTopoSound`/`ObligationTopoComplete` (the acyclicity
  clause's instrument); `ObligationM19_transport : Admissible σ → Reachable … σ` —
  stated, unproved; M19's restated home (W3-22).
- **Avoid:** never say a scan "establishes reachability" — it establishes `Admissible`
  (F-33's lesson); never treat `Admissible` as containing `Conforms` while M18 is an
  obligation record; never bypass `admissibleReport` to call its internal predicates
  from the shell (W3-3).

### Verdict / environment fault
- **Kind:** taxonomy (observable classes). **Code label:** the shell exit contract
  0/1/2; `StoreFault` (below) carries class 2.
- **Form:** exit 0 = checked and clean; exit 1 = checked, violations found; exit 2 =
  could not check — an environment fault, **never a verdict**. A run that could not
  read the store has no verdict to give.
- **Obligations:** the differential harness compares the class, and renders derive from
  constructor + path only (dual-host determinism).
- **Avoid:** never fold class 2 into class 1 (F-42's collapse); never render libuv
  message text into an observable.

### StoreFault
- **Kind:** model (shell carrier). **Code label:** `Shell.StoreFault` (W3-15).
- **Carrier:** `unreadable | vanished | denied | other`, each with the offending path;
  deterministic one-line render.
- **Obligations:** every store-touching IO call routes through it; a `StoreFault` maps
  to exit 2.
- **Avoid:** never default a fault to an empty view — an empty store checks clean, so a
  defaulting reader is a soundness break dressed as robustness.

### Canonical spelling
- **Kind:** model (predicate). **Code label:** `canonicalSpellingB`, internal to
  `E2/Admission` (W3-17), a `WFS` conjunct.
- **Form:** the per-family clause table (W3-17), including `usesBinderB` (a `mu` whose
  body ignores its binder is inadmissible).
- **Obligations:** every clause carries its spelling-family receipt; union-member
  clauses are mode-gated (F-50).
- **Avoid:** never phrase a spelling rule against `Conforms` — the yardstick is the
  **source construct** (see the rule below); never claim the clause table complete —
  completeness is an unchecked claim (no finite syntactic clause reaches the
  uninhabited generalisation).

---

## Rules (each kind: adr; each cites its ruling)

### plane-inheritance (W3-9/W3-10)
Every plane a carrier nests into inherits the carrier's admission clauses. **Why:** an
invariant that is a hard error on one plane and a comment on another will be violated
on the other (Unison D2; F-26 and F-28 are the estate's two instances). **Avoid:**
stating a nested plane's clause "operationally covered" by an outer check (F-21's
epitaph).

### host-relation-neutrality (W3-14)
No host string relation — order **or equality** — is ever load-bearing for an
observable, on any plane. **Why:** KICKOFF §4.5 closed the order trap on the identity
plane; F-39 was the equality trap on the name plane. **Avoid:** filenames as keys;
native comparators in any canonical order.

### source-construct-yardstick (W3-17)
Spelling admissibility is judged against the source construct, never against a lab
judgment. **Why:** `Conforms`-based collapsing would erase the discriminator and
restore #2787's precondition; SP-2/SP-4 prove the yardstick distinction is load-bearing.
**Avoid:** "these accept the same values, so merge them."

### canonicalizer-is-not-an-admission-rule (W3-17/W3-19)
A normalization pass asked to carry an admission rule is not even a function of its
equivalence class on the inputs the rule would have rejected. `canonS` stays
constructor-preserving permanently. **Why:** F-40/F-41's mechanism. **Avoid:** adding a
cross-constructor rewrite to `canonS` in lieu of a `WFS` clause.

### check-downgrade-posture (W3-16)
An enacted boundary check is weakened only by a ruled amendment citing an F-number —
never inside a seat, never to un-break a consumer. **Why:** the 24-hour softening
(Unison #6007→#6038). **Avoid:** warning-and-continue as a seat-level compromise.

### optimization-never-trust-source (W3-21)
A cache or amortization must be deletable with no observable change (M-INV-1..4); a
believed cache is a recipe, and a recipe-addressed store has no self-check. **Why:**
the Nix input-addressed row; the estate's own 6× memoization backfire. **Avoid:** a
manifest that records a verdict; ruling an amortization without a measurement.

### address-commits-to-encoding (promoted from the anatomy, W3-12 record)
The address commits you to an encoding, never to a storage format. Storage may change
freely (packing, manifests, layout) exactly while bytes-as-addressed stay fixed.
**Avoid:** reading a storage change as an identity change, or vice versa.

---

## Proposed CONTEXT-MAP.md addition

> - [Entity Store](docs/entity-store/CONTEXT.md): owns the content-addressed store's
>   vocabulary — admissibility, verdicts, canonical spelling, and the store's minted
>   rules. Relationships: **Lab Core → Entity Store** (grades and evidence vocabulary);
>   **Source Provenance → Entity Store** (the pinned Effect bytes behind MAPPING);
>   **Effect Language Semantics → Entity Store** (claim vocabulary; the correspondence
>   lane's separate business); **Entity Store → Schema JSON Codec** (the carrier is the
>   lab-owned projection the codec context described).


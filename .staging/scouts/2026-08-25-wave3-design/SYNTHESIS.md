# Wave-3 design pass — coordinator synthesis over the six reader reports

**Status: G0 advisory, 2026-08-25. This document decides nothing; every ruling below is
proposed for a grill docket, not taken.** It synthesizes the six Opus reader reports in
this directory (R-A Unison lessons, R-B canonical spellings, R-C boundary and open, R-D
typing plane, R-E Std-carrier and SHA3, R-F program spine), each of which carries its own
receipts. Claims here cite the report and, where load-bearing, the report's receipt.
Nothing was invented at this layer; where the readers disagree or leave a fork, the fork
is presented, not resolved.

Reader index:

| Report | Lane | Decides-nothing headline |
|---|---|---|
| `R-A-unison-lessons.md` | Unison's mistakes vs ours | 27 lessons; L4 was written and not shipped; the spelling class never gets fixed after it ships |
| `R-B-canonical-spellings.md` | F-27/F-34/F-29 repair space | `canonS` can absorb none of the ten families; the spelling rule belongs in `WFS` |
| `R-C-boundary-open.md` | family 2 + F-39/F-42/F-44/F-37 | one amendment package, twelve text changes drafted, `(place …)` is a precondition |
| `R-D-typing-plane.md` | family 1 + Q12 | option (i-a) is nearly free; M17 follows by construction; the A-3 record reverses on evidence |
| `R-E-std-carrier.md` | carriers within "no mathlib/crypto/cslib" + SHA3 | TreeMap carriers die at the kernel; F-12 is one comparison; half of F-44 is an accidental Θ(n²) |
| `R-F-program-spine.md` | stability stratification + engineering spec | STORE-SHELL **is** the engineering spec; FROZEN tier verified in source |

---

## 1. The operating question, answered

The wave opened on the operator's hypothesis — *the design is too limiting in allowing
Lean library functionality, and it is preventing engineering progress* — under the
standing constraint **no Mathlib, no crypto, no cslib**.

**The constraint is confirmed costless: nothing in the entire repair set needs any of the
three.** Every repair below is either estate-owned Lean, a toolchain-`Std` receipt already
inside the SH8 trust surface, or prose.

**The hypothesis itself is answered by R-E, and the answer is not the expected one.** The
one structural library move on the table — `Std.TreeMap`/`ExtTreeMap` as the model's
field carrier, making duplicate keys unrepresentable — is **rejected by the kernel**, not
by estate law: both types die in a nested-inductive position (R-E P1/P2; `TreeMap`'s own
docstring at `Std/Data/TreeMap/Basic.lean:63` says so), and the `Raw` variant that
compiles provides none of the guarantee while destroying `deriving DecidableEq` and
`termination_by structural` (P4/P5/P12). The library austerity was never the binding
constraint; the kernel's positivity discipline is. `Std`'s verified map lemmas remain
real and usable **at the shell** (`ordered_keys_toList`, `distinct_keys_toList`,
`toList_inj` — all landed sorry-free at `String` keys, R-E P8).

What was actually preventing engineering progress, per the readers, is small and cheap:

1. **One comparison.** F-12's involution — the root of six findings across two waves — is
   `E2/Canon.lean:31`'s `if key < k` sending equal keys *after* the run. Flipping the
   comparison makes `canonFields` a stable, idempotent sort, exhaustively verified over
   all 243 duplicate-heavy length-5 lists and provable from the core `mergeSort` lemmas
   (R-E P10/P11). It retires F-12, F-26, F-41 unconditionally. **Sequencing caution
   (R-E §7): alone it makes F-40 strictly worse** — every duplicate-key carrier becomes a
   canon fixed point — so the boundary `WFS` check must land first.
2. **One wiring gap.** All three `WFS` conjuncts have existed as decidable gated-core
   Bools all along; the boundary calls none of them (R-C §1.1). F-33 was never a
   missing-library problem — it is the opposite of the austerity hypothesis.
3. **One whitelist primitive.** `System.FilePath.symlinkMetadata` — not `metadata`, not
   `isDir`, per the toolchain's own doc-comment — closes the directory crash, the FIFO
   hang, and both symlink hazards at once (R-C §4.2).
4. **Two lines of arithmetic.** Roughly half of F-44's 2 MB digest cost is an accidental
   Θ(n²) `List.drop` inside the absorb fold (`fips202` `Impl.lean:96`, isolated at
   ×4.01–4.17 per doubling, R-E). Deleting it is representation-preserving. The ByteArray
   refinement behind it (scratch prototype: agrees on the CAVP vectors, 58–66× per block,
   ~104× at 2 MB) is estate-owned code — no crypto import — with one named proof trap
   (`UInt64` shifts mask mod 64; `BitVec` shifts do not; divergence is live at rotation 0).
5. **R-A's asymmetry sentence**, the frame for everything above: framing solved the
   direction Unison failed at (*under*-specification — many carriers, one byte string) and
   created no defence against ours (*over*-specification — one denotation, many byte
   strings). The repair for over-specification is admission discipline, not libraries.

---

## 2. Stability stratification (R-F, verified in source; riders quoted)

**The engineering specification already exists: it is STORE-SHELL.md**, by the PROCEDURE
§7 registry ("the shell's single authority"); a new spec document would itself be a
procedure amendment. Wave 3 therefore produces *amendment riders* to the three ratified
documents, not new documents. The one surface with no home is the Effect-facing client
(KICKOFF §4.6 sense 1) — recorded, not urgent.

**Tier FROZEN — safe to develop against today** (each verified in `E2/*.lean` against
every open fault): M4a both kinds; `encSchema_inj`/`encValue_inj`; M5 `directionA`; M7
kind separation (pre-image half); M12/M12E; M13; M14 fresh; M15 fresh; `tags_distinct`;
and — with the `Reachable`-arity rider — M8, M15's two faithful halves, NEG-2. Plus the
non-theorem frame: L1–L7, store-the-pre-image, joints A/B/C, the R-12 carrier shape, the
P1/P2 generation pipeline, the claim ladder, the additive-vs-arity law.

- **Rider A (arity).** Both repair families amend `Reachable`'s constructors; M8's
  induction pattern-matches positionally. Statements survive (premises are replaced or
  added; `Reachable` sits in hypothesis position); proofs need a mechanical re-check —
  A-3's precedent says this is cheap. The four ridered items are safe to develop
  *against*, not *concurrently with* the amendment window.
- **Rider B (bridge).** F-33 falsifies the shell's claim to establish reachability, not
  the theorems. Until family 2 lands, every `Reachable`-quantified theorem is unbridged
  on the disk side.
- **A-6-robustness (R-F finding 7).** M5 and M12/M12E carry canon only in hypothesis
  position; A-6 cannot touch them. M13/M14/M15-fresh never mention `Reachable` at all —
  the most stable rungs in the tree.

**Tier AMENDING** — M17/M17′, B1–B4, S1 obligations, A-6 (family 1); M9 (F-35);
STORE-SHELL §3/§4/§5/SH5 (family 2, F-42); names plane (family 3); MAPPING rules 1–2;
M10/M11-comm/M19 as unpinned statements.

**Tier OPEN** — R-4/G7 (now carrying F-5, F-24, F-29, and R-B §7's strictly-stronger
payload invariance — U-23: naming-by-id relocates injectivity into the registry); the
spelling-family admission; the names plane; deployment topology (R-15c ratified but
carrying the F-37 rider and the M19 fence); R-1 (the domain modeling document now in
progress is its natural vehicle — it needs a PROCEDURE §7 registry row to have standing,
and the rename it licenses is a serialization point); R-2 (the constructor-narrowing
window R-B reserves option (c) for); R-3; R-7; R-16a/b; extractor admission.

**Two plan-vs-tree deltas with no F-number** (R-F): the E2 carrier is hand-written where
the ratified generation architecture calls for generated; `LEDGER.md` is specified and
absent while the extractor's TOOLS.md rows are drafts.

---

## 3. The composed repair path

### 3.1 Why one docket

R-F names the collision: family 1 changes `Reachable.putE`'s premises; family 2's repair
reaches the model wherever `WFS` gains clauses; PROCEDURE §3.2 allows at most one open
docket. R-C resolves most of the tension — family 2's model-side content (`wfsB` + iff
theorem, `topoOrder` + two obligations) is **additive**, hence flight-safe — leaving a
single serialized core: the `WFS`/`Reachable` strengthening set. The readers' repairs
compose into **one deliberately composed grill docket** and **two implementation
windows**, with everything else concurrent.

### 3.2 The grill docket (proposed rulings, in dependency order)

1. **Family 1 = option (i-a)** (R-D): `putS` premise `WFS (canonS s)`; `putE` premises
   `Conforms env (canonS s) (canonV v)` and `dupFreeV (canonV v)`. Nearly free — the
   `Conforms` premise is consumed by zero proved theorems; three proofs touched, two
   shorten; B4 **retired**; M17 then follows by construction with no `H`-injectivity.
   Explicitly reverses the A-3 "boundary admission" record on four items of post-dating
   evidence (R-D §6.2). Rider question for the operator: is STORE-MODEL §5's `s` the
   *resolved* schema? If yes, the schema half is an F-22-class transcription correction,
   not an amendment. Residual named, not hidden: M17 is env-relative until M17′ is stated.
2. **F-26 repair ships with A-6** (`dupFreeS (.lit v) := dupFreeV v`) — load-bearing for
   F-28 independently of A-6 (R-D §6.1). Order across every branch: A-6+F-26 (equation
   window) → `Reachable`/`WFS` amendment (definition window) → M17 seat.
3. **The `canonFields` comparison flip** (R-E's fourth option): rule it, sequence it
   after the boundary `WFS` check exists. It makes the S1 idempotence obligations
   unconditional again and dissolves F-41's self-reject at the root.
4. **Family 2 = R-C's amendment package**: `wfsB` minted in E2 with `wfsB_iff`; `dupFreeV`
   named as the value-plane admission (or `wfvB`); boundary check ordering **WFS before
   canonicity** (the ordering restores `ObligationCanonIdempotent`'s hypothesis — F-41's
   verdict was the involution leaking); Kahn's `topoOrder` + `ObligationTopoSound/Complete`
   (triples as F-32's check, M19's witness, M10's rank); SH5 narrowed to **`Admissible`,
   not `Reachable`** with `ObligationM19_transport` stated as the bridge; the twelve
   drafted STORE-SHELL text changes. Two governance riders from R-A: decide **now**
   whether an enacted boundary check may ever be downgraded (Unison's hard error survived
   ~24 hours), and adopt refuse-with-reason error text (U-15). One open sub-question:
   PUT and scan currently order checks differently, defensibly (R-C §3.3).
5. **The spelling rule lands as `WFS` conjuncts** (R-B option (b)): the clause table of
   §5.2 including `usesBinderB` (~20 lines, kills the unbounded `mu` family; G3 survives
   untouched); `canonS` stays constructor-preserving forever (the partition already
   exists in the estate's behaviour); completeness marked with an unchecked-claim marker
   (no finite syntactic clause reaches the uninhabited-generalisation, R-B §2.4.4);
   union-member dedup mode-gated (SP-3 under `oneOf` is a decode *failure* — a Q12
   instance nobody recorded); carrier narrowing (option (c)) reserved for the R-2 window,
   where it kills SP-7 structurally and closes the property+index-signature
   expressibility gap. `litNarrowB` (F-35) lands at the same call site if family 1's
   docket rules the model clause.
6. **Q12/F-36**: posture (a) — the drafted anti-claim sentence (R-D §7.1) plus an
   Anti-claim column on §6's coupling table — costs zero. Posture (b) is blocked by
   strict positivity as a constructor and is a lane-sized rewrite otherwise. The third
   posture (reject `oneOf` at admission, as a `WFS` conjunct, never a boundary promise)
   is cheapest of all if the expressivity loss is acceptable. MAPPING row 1's own
   standard (silent *widening* = the class row 1 forbids as narrowing) argues the price
   must be loud at the admission table wherever it lands.
7. **F-39 = "which relation is authoritative", then which plane** (R-A U-12 reframes it:
   the rule to mint is *no host string relation — order or equality — is ever
   load-bearing for an observable*). R-C prices five options; 2 (hex-encoded name files)
   and 3 (single index file) answer "the model" and close all four hazards; option 4
   refuses both dev hosts — a non-starter. Rider under option 2: a 64-char name-length
   cap restores `MAX_PATH` parity; a names listing verb buys back inspectability.
8. **F-42**: admit `symlinkMetadata` for one purpose; the read-only-regular-files rule;
   typed `StoreFault` with the deterministic render rule (never libuv's `details` — the
   dual-host transcript depends on it); the already-written three-way exit contract made
   reachable; **G-S5** gate leg forbidding `Metadata.accessed/modified` so "no clock"
   stays mechanical.
9. **Harness preconditions**: the `(place …)` primitive family (three of six pieces are
   untestable without it); commit-and-flip the assert-today's-defect scripts (the flip is
   the amendment record under PROCEDURE §5's ratchet).
10. **SH5′ deferred to a measurement** — after the Θ(n²) `List.drop` fix lands, since it
    halves the cost the manifest would amortize and changes the economics. When ruled:
    WF1-only, crude listing-digest invalidation, the four M-INV clauses, script
    `28-manifest-lying` as the decider (R-C §6). The ByteArray SHA3 refinement is a
    parallel estate-owned lane with its bridge trap named.
11. **Pins**: M19 re-based on `Admissible`; M10 with address-node vocabulary +
    `ObligationM10_rank`; M11-commutation up to find-extensionality **with**
    `reachable_keys_nodup`; `version_byte_separates` (U-16 — Unison's untested C4
    argument, dischargeable in the estate's own `sha3_ne_prefips_spec` style); the
    intra-kind faithfulness statement in its honest form — "injective except on the
    characterised set", where F-34's families *are* the characterisation (U-9).
12. **F-37 rider + F-45**: independent of everything; `.gitattributes * -text` under the
    store root now (the estate has already shipped one CRLF-corrupted digest record —
    census `:14-15`); fix the script count.

### 3.3 Windows and concurrency

```
now (no ruling needed):  .gitattributes rider · F-45 count · Θ(n²) drop fix (fips202)
grill docket:            rulings 1–11 above, one docket, deliberately composed
window A (equations):    A-6 + F-26 · canonFields comparison flip (after boundary WFS)
window B (definitions):  Reachable premises (i-a) + dupFreeV + WFS conjuncts
                         (spelling clauses · litNarrowB · anyOfOnly if ruled)
concurrent seats after:  M17 seat · boundary wiring + Kahn's + (place …) ·
                         F-42 seat · F-39 seat · M19 transport seat ·
                         ByteArray SHA3 lane · ledger extractor · pin seats
R-2 window (later):      carrier narrowing (Arrays/Objects merge + checks-array merge)
```

The M17 seat runs **after** both windows (it never unfolds `canonS`, so it is robust to
window A; running it earlier means running it twice — R-D §8).

---

## 4. Mint candidates for the domain modeling document

Formatted for intake; each needs the estate's minting shape (name, artifact kind, carrier
or judgment form, obligations, avoid-list) before it binds. The document itself is R-1's
natural vehicle and needs a PROCEDURE §7 registry row to have standing.

| Candidate | Statement | Source |
|---|---|---|
| **plane inheritance** | every plane a carrier nests into inherits the carrier's admission clauses | R-A U-7 (states the F-26 and F-28 repairs once; Unison's D2 is the precedent) |
| **host-relation neutrality** | no host string relation — order or equality — is ever load-bearing for an observable, on any plane | R-A U-12 (generalizes KICKOFF §4.5; F-39 becomes an instance) |
| **source-construct yardstick** | the single-spelling rule is phrased against the source construct, never against `Conforms` | R-B §1.1, R-A Part IV (protects G3 while fixing F-27/F-34) |
| **`Admissible` (candidate store)** | the decidable clause-set a scan establishes; `Admissible → Reachable` is a theorem, never an assumption | R3 §6 via R-C §1.3/§2 |
| **verdict vs environment fault** | an exit code is a verdict only when the check ran; a run that could not read the store has no verdict to give | R-C §4.4 |
| **check-downgrade posture** | whether an enacted boundary check may be downgraded, and by what act | R-A U-6 (the 24-hour lesson) |
| **optimization, never trust source** | a cache must be deletable with no observable change; M-INV-1..4 | R-C §6.3 |
| **the address commits to an encoding, not a storage format** | already in the anatomy; worth minting as estate law | anatomy §2.4 via R-A U-19 |
| **canonicalizer ≠ admission rule** | a normalization pass asked to carry an admission rule is not even a function of its equivalence class on the inputs the rule would have rejected | R-B §1.4 (F-40/F-41's mechanism, generalized) |

---

## 5. Acquisition-gap register (consolidated)

Held-corpus gaps only; none blocks the docket. (a) Unison clone and the eleven
canonical-hashing papers: pinned, bytes absent on this host — every citation is one hop
through the estate's own dossiers. (b) No analysis of Unison Share's sync protocol or
consistency model exists anywhere in the corpus. (c) The anatomy records nothing on
case-folding/Unicode in any real system's name plane; git's `core.ignorecase`,
`packed-refs`, `fsck` message table, and `transfer.fsckObjects` defaults are all cited
from memory in the wave-2 reports and remain UNVERIFIED. (d) OSTree appears nowhere with
standing. (e) Everything Windows: the dual-host leg, reserved names, `MAX_PATH`,
`autocrlf` on a real checkout. (f) Option (b)'s subtype-in-nested-position feasibility —
R-E names it the cheapest high-value follow-up probe.

## 6. Open questions routed to the operator (deduplicated)

1. Is STORE-MODEL §5's `s` the resolved schema? (Decides whether family 1's schema half
   is a correction or an amendment — R-D §1.1.)
2. Does the value plane's duplicate-freedom become `Reachable` clauses, reversing the A-3
   record? (The readers' evidence says yes; the reversal is yours to take — R-D §6.2.)
3. Q12: anti-claim, admission-side `anyOfOnly`, or both? (R-D §7.3.)
4. F-39: which plane is authoritative — and under option 2, the name-length cap and
   listing verb riders? (R-C §5.3.)
5. May an enacted boundary check ever be downgraded, and by what act? (R-A U-6.)
6. Do PUT and scan run the same check order? (R-C §3.3.)
7. Does the harness gain `(place …)`, and do the defect scripts commit-and-flip? (R-C §2.7.)
8. Is SH5′ ruled before its measurement exists? (R-C §6.5 argues no; the drop fix should
   land first either way.)
9. Does the comparison flip ship in window A? (R-E's sequencing caution noted.)
10. Does the domain modeling document take the §4 mint candidates, and does it take the
    R-1 registry row with it?

---

*End of synthesis. G0 advisory. It decides nothing.*

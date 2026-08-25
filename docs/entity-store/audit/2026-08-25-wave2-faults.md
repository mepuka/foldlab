# Wave 2 fault register — every reported fault against the theory it violates

Status: G0 register, 2026-08-25. Companion to `2026-08-25-wave2-triage.md` (which ranks)
and `FINDINGS.md` (which is the append-only ledger). This document states, for each
fault, the exact claim it contradicts and where that claim is written. Evidence:
`.staging/scouts/2026-08-25-wave2/`. It decides nothing; the rulings are the operator's.

Convention: **Violated theory** quotes or paraphrases the claim as ratified, with its
home. **Fault** states the mechanism. **Receipt** names the probe or transcript. Where a
finding violates no claim, the register says so rather than inventing one.

---

## S1 — a ratified claim or stated theorem is false

### F-43 — the trust instrument was evadable · FIXED `2f33ae0`
- **Violated theory.** STORE-SHELL §2, layer-2 discipline: "every function is (a) a pure
  core call, (b) a whitelisted IO primitive, or (c) a composition — nothing else," and
  the G-S gate claims that make it mechanical (`Shell/Gate.lean` header, G-S1…G-S4).
- **Fault.** Three escapes. (a) Coverage tested the *name prefix* `Shell`, but the
  executable roots define top-level `main`, so `Main`/`EncodeMain`/`HarnessMain` were
  never scanned: a clock, `IO.getEnv`, or a random source in `main` built all-gates-green.
  (b) `isInternal` carried a blanket `s.startsWith "_"`, so any constant named `_foo`
  evaded G-S1, G-S2 and G-S4 simultaneously. (c) G-S4 asked only `env.contains (E2 ++
  base)`, leaving the digest `Sha3.Impl.sha3_512` shadowable — the one function whose
  silent replacement forges every address in the store.
- **Receipt.** Refuter 2 target 4, coordinator source-confirmed at `Gate.lean:78/92/116`.
- **Repair.** Coverage by module membership; roots declared as a library with a gate leg
  each; enumerated companion list; G-S4 over `[E2, Sha3, Sha3.Impl, Sha3.Spec]`.
  Negatively validated (`IO.getEnv` in `main` now fails G-S3), then reverted.

### F-25 — M17 typed reachability is false
- **Violated theory.** STORE-MODEL §5: "Every reachable store is internally well-typed:
  for every stored entity, its schema resolves and its value conforms"; inventory row M17.
- **Fault.** `Reachable.putE` takes `Conforms env s v` on the **raw** carrier, but
  `putEntity` stores `preimageE sAddr v`, which embeds `encValue (canonV v)`. The stored
  entity's value is `canonV v`, and no premise establishes `Conforms env s (canonV v)`.
  The schema half has the same shape: `putS` requires `WFS s` and stores `canonS s`. The
  gap is exactly bridge pin B4 — pinned, unproved, and conditional. A-6 does **not**
  close it: the failing route is `refine`/`checkSem`, which contains no `lit` node.
- **Receipt.** R1 `M17_store_form_FALSE`, `M17_survives_A6_FALSE` (kernel, reverified).

### F-39 — model and disk disagree on names, silently
- **Violated theory.** STORE-SHELL §1 rung 1: "the same operation scripts run against the
  pure model and the disk store; observable results compare byte-for-byte," and §6, which
  makes that comparison the v0 acceptance gate.
- **Fault.** Name keys are Lean `String`s in the model and filenames on disk. On a
  case-folding filesystem (APFS, NTFS) `name-set "Widget"` then `name-set "widget"`
  yields two model bindings and one disk file; `name-get` then returns different
  addresses on each side, **both exiting 0**. A silent wrong answer, not a crash.
- **Receipt.** Refuter 2 target 1, reproduction transcript.

### F-33 — `check` clean does not imply reachable
- **Violated theory.** STORE-SHELL §4/SH5: opening a directory "ESTABLISHES reachability";
  STORE-MODEL §3 joint-A sharpening, which requires an implementation to *establish*
  reachability before the theorems apply.
- **Fault.** The boundary enforces no part of `WFS` — not `closedB`, not `guardedB`, not
  `dupFreeS`. A schema `.var 0` (open de Bruijn index) and `(mu d (var 0))` (unguarded)
  both store and check clean. Every store theorem quantifies over `Reachable`; the shell
  therefore certifies stores the theorems do not cover.
- **Receipt.** R3 `HEADLINE_scan_does_not_establish_reachability`; refuter 2 target 2.

### F-40 — the canonicity check admits duplicate keys (supersedes F-21)
- **Violated theory.** STORE-SHELL §5 check 2 (re-canonicalize and byte-compare), and
  F-21's disposition text, "operationally covered by the canonicity byte-compare."
- **Fault.** `canonFields` is an involution on a duplicate-key run (F-12's mechanism), so
  a **palindromic** run byte-compares equal to its own re-canonicalization. A three-field
  carrier keyed `"a"` with two distinct schemas is admitted and checks clean. The same
  holds on the value plane for `vobj`.
- **Receipt.** Refuter 2 target 2, reproduction.

### F-26 — A-6 as ruled re-falsifies S1
- **Violated theory.** `ObligationCanonIdempotent` / `ObligationCanonVIdempotent` in
  their post-F-12 conditional forms (`E2/Obligations.lean`), under the Q13 ruling that
  `canonS` recurse into `lit` payloads.
- **Fault.** `dupFreeS (.lit _) = true` unconditionally, so a lit payload carrying
  duplicate keys satisfies the hypothesis while `canonS` now sorts it — the involution
  reappears one plane up, exactly where the condition no longer guards.
- **Receipt.** R1 `A6_refalsifies_S1` (kernel, reverified). Repair supplied and checked
  over 15,310 schemas: `dupFreeS (.lit v) := dupFreeV v`.

### F-32 — acyclicity is independent of WF1+WF2 and unchecked
- **Violated theory.** STORE-SHELL SH5's "establishes reachability" again, and by
  implication WF3/M10, which hold on reachable stores only.
- **Fault.** A store can satisfy WF1 (every binding hashes to its key) and WF2 (every
  reference resolves) and still contain a reference cycle, hence be unreachable. `check`
  tests neither acyclicity nor anything implying it. Kahn's algorithm both decides it and
  emits M19's insertion-order witness.
- **Receipt.** R3 `HEADLINE_wf1_wf2_insufficient` (kernel).

---

## S2 — would become false, or propagate, when planned work lands

### F-41 — the boundary rejects bytes it produced itself
- **Violated theory.** STORE-SHELL §5 check 2, and the Q5 canonical-image strictness
  ruling ("the store never holds a non-canonical byte-form of anything").
- **Fault.** `preimageS` is not idempotent **as a byte function** on duplicate-key input,
  so `schema-put` of a non-palindromic duplicate-key carrier is rejected as non-canonical
  — bytes the shell itself just produced. The mirror image of F-40.
- **Receipt.** Refuter 2 target 2.

### F-42 — verification-on-open is not total
- **Violated theory.** STORE-SHELL §5 (`check`'s exit code is the verdict) and §3 (the
  SHELL-v0 IO whitelist).
- **Fault.** A missing object or name file raises an uncaught Lean exception whose exit
  code 1 is indistinguishable from "violations found" — verdict ambiguity. A FIFO in the
  objects directory hangs unboundedly. `readView` cannot do better: the §3 whitelist
  contains no file-type primitive, so the fix requires a whitelist amendment or an
  explicit non-totality caveat in §7.
- **Receipt.** Refuter 2 target 3, reproduction.

### F-30 — M19 as worded is refuted four ways
- **Violated theory.** Ruling G8 and STORE-MODEL §6's M19 row: "every ref-closed, acyclic
  finite set of pre-images admits an insertion order reaching it."
- **Fault.** Naive ref-closure ignores the referent's **kind** (a `vaddr` resolving to an
  entity satisfies closure but can never satisfy `putE`'s schema premise), ignores
  conformance, and ignores `WFS`; and "reaching exactly that set" fails under an
  `H`-collision. Caught while still prose — nothing was built on it.
- **Receipt.** R3 `C_obstruction`, `D_no_conformance`, `F_exactly_fails` (kernel). Repair
  supplied: re-base the statement onto candidate stores (`Admissible` structure).

### F-28 — duplicate-key values are reachable inside the model
- **Violated theory.** The A-3 record in STORE-MODEL §7: value-plane duplicate-freedom is
  "a boundary admission, not a `Reachable` clause (a JS object cannot carry duplicate
  keys, so the excluded values have no host counterpart)."
- **Fault.** Duplicate-key values are constructible and reachable **inside** the model via
  `.record` and via `.lit`, so `ObligationCanonVIdempotent` is vacuous exactly where F-12
  bit; and the boundary that was supposed to carry the admission does not check it.
- **Receipt.** R1 `E5_dup_value_reachable`, `E6` (kernel).

### F-35 — `.lit (.vaddr a)` hides an address from `refsS`
- **Violated theory.** STORE-MODEL §3 WF2 (reference closure) together with joint B, which
  fixes `refs` on carriers; MAPPING admission rule 1 (`.lit` narrowing) currently sits at
  the boundary with no model clause.
- **Fault.** An address inside a `lit` payload is invisible to `refsS`, so a schema can
  carry a reference that WF2 never sees. The boundary rule is therefore load-bearing for a
  model invariant — the fourth model-accepts/boundary-rejects instance (after F-3, F-12,
  F-21).
- **Receipt.** R3 SP-11 `sp11_reachable` (kernel).

### F-36 — Q12's price is real, not theoretical
- **Violated theory.** Ruling Q12 (STORE-MODEL §7), which kept `Conforms` blind to the
  union `mode` byte as a priced divergence on the reasoning that exclusivity is a decode
  semantic; and M17's phrasing, which would certify the store "internally well-typed."
- **Fault.** Under `oneOf`, a second successful member match is a decode **failure**
  (census §5a, `SchemaAST.ts:3071-3073`), while `Conforms` accepts. M17 would therefore
  certify a value Effect's decoder rejects. `mode` is in identity, so the two schemas are
  distinct addresses — the divergence is observable, not notional.
- **Receipt.** R3 `ov_reachable`, `mode_is_in_identity` (kernel).

---

## S3 — a real gap needing a ruling; no current claim false

### F-27 — A-4's edges collapse into existing spellings
- **Violated theory.** MAPPING admission rule 2, the single-spelling rule ("one source
  construct, one byte form").
- **Fault.** `.array e` and `.tupleRest .nil e` accept the same values for **every** `e`
  but encode differently — an infinite family of two-address source constructs. Also
  `.tuple es ≡ .tupleRest es Never` and `.record Never ≡ .object .nil`.
- **Receipt.** R1 `A2_two_addresses`, `B3_tuple_eq_tupleRest_never`, `C1` (kernel).

### F-34 — the single-spelling rule is radically incomplete
- **Violated theory.** MAPPING admission rule 2 as written, which enumerates two cases.
- **Fault.** At least ten spelling families exist, one **unbounded**: `.mu d X` for any
  binder-free `X` gives one address per discriminator string, all denoting `X`.
- **Receipt.** R3 `R3-p3_spellings` — ten proved equivalences with byte receipts.

### F-29 — check payloads are address-significant and uncanonicalized
- **Violated theory.** No ratified claim is contradicted; the gap is against Q11/R-10's
  principle (canonical image before hashing) and against F-24's requirement that
  `checkSem` be `canonV`-invariant.
- **Fault.** Two source-identical refinements whose check payloads differ only in field
  order take two addresses, because nothing canonicalizes `Check` payloads.
- **Receipt.** R1 `C5`/`C6`/`C7` via `encSchema_inj`.

### F-37 — git contributes nothing to our invariants
- **Violated theory.** Ruling R-15c (git as transport), insofar as it was read as
  inheriting git's integrity guarantees.
- **Fault.** Git's connectivity and `fsck` cover git's own DAG; our reference edges live
  inside blob content git never parses, so they contribute zero to WF2/WF3. Hazards named:
  `core.autocrlf` corrupting binary pre-images (fix: `.gitattributes`), 128-hex filenames
  against Windows `MAX_PATH`, and checkout deleting objects — append-only is not a git
  property. Dual-host items flagged `UNVERIFIED`.
- **Receipt.** R3 §5.2.

---

## S4 — bookkeeping, measurement, and results worth pinning

### F-44 — digest throughput (no theory violated)
`sha3_512` runs at roughly 26 KB/s, and every verb re-opens the store with a full scan,
so a single 2 MB object costs about 76 s on every subsequent verb. Claims-free: STORE-SHELL
§7 claims v0 correctness only. A v1 concern for verification-on-open amortization.

### F-45 — a count is wrong in two documents (no theory violated)
STORE-SHELL §9 and the shell README both say "nine committed scripts"; there are ten, and
the harness agrees with ten.

### F-31 — M10 survives (positive result)
Acyclicity survived attack for arbitrary `H`, including deliberately colliding hashes,
because `putPre` no-ops on an occupied address. The statement must say its graph nodes are
**addresses**, not pre-images. `ObligationM10_rank` proposed: the store list is in reverse
topological order.

### F-38 — F-15's disposition sharpened (positive result)
Listing order is **not** observable — the shell sorts by address (`Boundary.lean:196-207`)
— but `find`-equality is coarser than `check`'s printed `objects=` count. Companion lemma
`reachable_keys_nodup` proved: key-functionality is a `Reachable` invariant. M11-commutation
should pin up to find-extensionality **with** that lemma.

---

## Summary

Twenty-one faults. Seven violate a ratified claim or stated theorem outright (one now
repaired); six would have propagated into planned work; four are design gaps; four carry
no violated claim, two of those being positive results. Three ratified documents are
contradicted somewhere in this register — STORE-MODEL (§5 M17, §7 A-3 and Q12 records),
STORE-SHELL (§1 rung 1, §3, §4/SH5, §5) and MAPPING (rules 1 and 2) — together with two
pinned-but-unproved statements (bridge B4, M19 as worded).

# Verified hash primitive — implementation spec and roadmap (DRAFT)

**Status:** staged material, pre-grade, written 2026-08-24 for operator discussion. Nothing here is
ratified; open decisions are collected in §7.
**Evidence base:** `.staging/e1/unison-hashing.md` (byte pipeline, pinned `84b95a62`),
`.staging/e1/concrete-capability.md` (fragment probes, pinned `28a25a4e2`),
`.staging/explore/unison-verification-claims.md` (claims C1–C12b/P1–P13, deviations D1–D10, §8 live
tracker), `.staging/explore/itrees-capabilities.md` (hooks D/E). Claims below not traceable to those
reports or to the cited standards are marked **[unverified]**.

---

## 1. Problem and goal

**Problem.** The lab's CAS work needs a cryptographic digest primitive whose implementation we can
make claims about with proofs, not vibes. Every layer above it (tokenizer, cycle canonicalization,
chain) treats the hash as a parameter `H`; the layer *is* only as inspectable as its weakest brick.

**Goal.** A machine-checked implementation of one standard, safe, performant hash algorithm:
executable Lean 4 reference + theorem spine + generated conformance vectors, packaged as the lab's
first formal-verification-grade artifact, with an explicit statement of what is and is not claimed.

**Non-goals (never claimed):** collision resistance, preimage resistance, side-channel properties,
anything about compiled binaries. Collision resistance appears only ever as a *hypothesis* of
downstream theorems (the trust structuring already fixed in the E1 spec draft), never as an axiom.

## 2. Candidate algorithms

| | SHA3-512 (FIPS 202) | SHA-256 (FIPS 180-4) |
|---|---|---|
| Role in our stack | **The hash Unison V2 actually uses** (untruncated, 64-byte digests — `Tokenizable.hs:122-137`). Required for any Unison-conformance lane. | The one hash with existing Lean proofs in the Concrete tree (178 theorems, `proofs/Examples/HmacSha256/Proofs.lean`) |
| Core structure | Keccak-f[1600] permutation: 5×5 lanes of 64 bits, 24 rounds of θ/ρ/π/χ/ι; sponge with rate 576 / capacity 1024 for the 512-bit variant; pad10\*1 | 64-round compression on 8×32-bit state; message schedule; Merkle–Damgård with length padding |
| Operations needed | xor, and, not, 64-bit rotations — **no multiplication** | add mod 2³², xor, and, not, shifts/rotations — no multiplication |
| Concrete-fragment fit | **Unprobed.** χ = and+not and rotations look fragment-shaped, but Keccak needs *u64 lanes* and the capability report's admitted-ops list was verified at u32 only **[unverified — R4 probe]** | **Probed and proved upstream**: fits ProvableV1; the existing proofs carry `Lean.ofReduceBool` + `Lean.trustCompiler` (bv_decide's native LRAT checking) |
| Existing Lean 4 formalization | **`kim-em/lean-crypto-hash`** (found by the tactics audit, pushed 2026-08-24, days old, 2 stars): SHA3-512 + SHA-2, zero deps, 129 theorems inside the target axiom envelope, NIST-conformant, kernel-reducible — **first-hand review required before any reliance**. Also `openvm-fv` (executable model, no correctness theorems), `lean-keccak-unrolled` (impl-equivalence, heavier trust) | Concrete's (native-trust axioms); openvm-fv model (unproved frontend); mathlib and Isabelle AFP: none |

**Draft recommendation (for discussion, not decided): SHA3-512 primary, SHA-256 as leverage.**
SHA3-512 is what the Unison-claims program needs end-to-end; a pure-kernel SHA3-512 would be new in
the Lean ecosystem *if* the sweep confirms absence. SHA-256 work risks duplicating Concrete's
corpus — unless we take the specific upgrade lane: re-proving their statements **without** the
native-trust axiom pair, which the capability report already sized as "substantial work" and which
would be a direct, legible contribution to the Concrete community (§6).

## 3. Architecture (three-role ruling, applied to the primitive)

```
FIPS 202 / 180-4 (paper spec, pinned PDF in .reference/papers/)
        │  hand transcription — the one human-trust step, kept small & reviewable
        ▼
L-SPEC  Lean executable spec (bit/lane-level, clarity over speed)   ← theorems attach HERE
        │  refinement theorem (O5)
        ▼
L-FAST  Lean performant impl (ByteArray, u64 lanes, loops)          ← KATs + refinement
        │  generated vectors (byte-identical rule)
        ▼
C-TWIN  optional Concrete implementation (arena style, §R4)         ← conformance-tested,
                                                                       G3 refinement later
```

The Lean spec is simultaneously the reference implementation (it executes; it prints digests; it
generates every conformance fixture — the generated-vectors rule satisfied by construction). The
Unison pinned binary enters only above this layer, at the tokenizer/conformance lane, not here.

## 4. Proof obligations catalog

Per-obligation: statement shape, gate, and what discharging it does *not* claim.

- **O1 — Spec well-formedness.** Round constants, ρ rotation offsets, and state-indexing maps are
  total and correctly typed; state permutations θ/ρ/π/χ/ι are total functions on the 5×5×64 state.
  Largely definitional; the content is that nothing is partial and no index is out of range.
- **O2 — Padding correctness.** pad10\*1 (resp. MD length padding): padded length is a rate
  multiple; padding is injective on messages (`pad m₁ = pad m₂ → m₁ = m₂`); unpadding recovers the
  message. This is the obligation that kills a whole family of real-world length-extension-shaped
  encoding bugs at the spec level.
- **O3 — Sponge/MD assembly.** Absorb/squeeze (resp. compression chaining) assembled per standard;
  digest length exactly 512 (resp. 256) bits. Statement form: structural equations, not security.
- **O4 — KAT conformance (gate, not theorem).** All NIST FIPS test vectors for the chosen variant
  reproduced by *executing* L-SPEC; fixtures regenerated byte-identically in CI (`mise run check`
  shape: gen + `git diff --exit-code`). A KAT pass is sampled evidence, recorded as such.
- **O5 — Refinement.** `∀ m, LFAST.hash m = LSPEC.hash m`. The central theorem. Proof strategy is a
  decision point: structural induction + lemma spine (pure kernel, slower to write) vs `bv_decide`
  per-round (fast, imports the `ofReduceBool`/`trustCompiler` trust pair — exactly what Concrete's
  SHA-256 proofs did). See D3.
- **O6 — Byte-pipeline correctness (integration, later).** When wired under the Unison-V2
  tokenizer: `accumulate` framing per the recipe (version byte per node, big-endian widths,
  `Hashed` raw vs `Bytes` length-prefixed). Obligations here belong to the tokenizer artifact (T1
  keystone), not the hash; listed to fix the boundary.
- **O7 — Axiom hygiene (standing gate).** `#print axioms` on every exported theorem; report
  committed beside the artifact. Target profile: `[propext, Quot.sound]` (+ `Classical.choice` if
  it sneaks in via library lemmas). **Auditor correction (2026-08-24): the gate must be an
  ALLOWLIST, not a denylist** — `bv_decide`'s axiom contribution is per-goal, not per-tactic, and
  from Lean v4.29 it mints bespoke axioms that a fixed denylist would miss. `native_decide` stays
  banned (pre-registered in the E1 draft).
- **O8 — Negative-claims statement.** A prose+ledger section enumerating non-claims (§1). The
  estate's "formally verified, scoped" discipline applied to ourselves.

## 5. Roadmap

| Stage | Work | Gate to pass |
|---|---|---|
| **R0** | Prior-art adjudication: existing Lean 4 SHA-2/SHA-3? (state-of-play sweep, in flight). Reuse-first is standing policy — if a serious mechanization exists, we build *on* it and re-scope our novelty to the CAS integration | Sweep report read; build-vs-reuse decision minuted |
| **R1** | L-SPEC in the e1 Lake project (new module tree, e.g. `E1/Hash/Spec.lean`); NIST KATs generated from the model | O1 partial, O4 green locally |
| **R2** | Theorem spine on L-SPEC: O1 complete, O2, O3 | `lake build` green incl. proofs; O7 report clean |
| **R3** | L-FAST + O5 refinement; microbenchmark vs L-SPEC (performant ≠ competitive with C — target "usable for vector generation and repo-scale hashing") | O5 proved; KATs pass on L-FAST; O7 re-run |
| **R4** | Concrete twin probe: does Keccak fit ProvableV1? (u64-lane question; probe method = the capability report's seven-probe pattern). Outcome is information, not a blocker — twin ships as `tested_by_oracle` either way | Probe results written up; upstream issue filed if the fragment docs need refining again |
| **R5** | Wire under the tokenizer artifact (T1 program): hash as parameter `H`, instantiated with L-FAST; conformance lane vs pinned UCM begins | O6 obligations drafted in the tokenizer spec |
| **R6** | Promotion: move out of `.staging` into the graded home, `mise` task wiring, REFERENCES.md pins for FIPS 202/180-4 + reused libraries, release notes | Full `mise run check`; estate gates; operator ratification |

Sequencing note: R1–R3 are pure Lean and independent of every open question except R0's
build-vs-reuse. R4 is parallelizable. R5 depends on the tokenizer artifact existing (separate spec,
same pattern, T1 keystone — not this document's scope).

## 6. Qualities and contribution surfaces (for the after-lunch discussion)

- **To the Concrete community:** (a) a pure-kernel re-proof lane for their SHA-256 corpus removes
  the one trust caveat their flagship carries; (b) the R4 probe extends their fragment
  documentation (we already refined `PROVABLE_V1.md:92` once, by bisection); (c) the check-proofs
  theorem-lookup defect and doc findings, filed as reproductions. Small, immediate, legible.
- **To Unison:** conformance vectors generated from a verified reference; a proved orbit/cycle
  canonicalization (their #2787, community-proposed, unanswered for a year) is the flagship
  candidate *after* the hash lands; deviation receipts where their implementation falsifies their
  claims (#3509 tag-erasure).
- **To the lab itself:** first formal-verification-grade artifact through the full discipline —
  staged → gated → promoted, axiom report, generated vectors, scoped claims. The competence proof.
- **The "verified CAS pattern" publishable kit (fun lane, keep light):** hash primitive + tokenizer
  + store spec + conformance harness, each with its trust statement — the sidecar/in-toto hook from
  the ITree report notes the niche is empty.

## 7. Decisions — RATIFIED 2026-08-24 (operator, end of day)

**D1, D2, D3, D4, D5, D7: GO as recommended. D6: HELD until the operator says so.**
**Standing gate added (operator's words: "both results need to be absolutely clean no questions
whatsoever"): every landed artifact is re-checked on BOTH hosts — this PC and the tailnet Mac —
and both runs must be absolutely clean before any claim is made.** The split project is scaffolded
at `.staging/sha3` (working name, D5 mint pending), pinned v4.33.1, carrying the KAT probe as its
first standing gate. The decision list below is preserved as ratified:

- **D1 — Algorithm:** SHA3-512 primary (draft recommendation) vs SHA-256-first as warm-up vs both.
- **D2 — Build vs reuse:** the R0 sweeps are in. Candidates: `kim-em/lean-crypto-hash` (SHA3-512 +
  SHA-2 with theorems, days old — review first-hand) and `openvm-fv` (model only). If the former
  proves what its README claims, reuse-first policy points at building ON it and moving the lab's
  novel work up-stack (tokenizer T1, cycle canonicalization) — decision needs the first-hand read.
- **D3 — Proof-strategy trust profile:** operator pre-signaled PURE KERNEL. The feasibility half is
  now **demonstrated, not speculative**: the tactics audit ran a full 25-lane Keccak-f[1600] KAT
  `by rfl` in 26 s (`decide +kernel`: 17 s) at `[propext, Quot.sound]`, core-only, v4.28.0. No
  trust/feasibility trade-off exists for O4.
- **D4 — Concrete twin:** probe-only (R4 as information) vs commit to shipping the twin in v1.
- **D5 — Naming/venue for the artifact and where the graded home lives** (`formal/` layout is
  currently empty — this becomes its first resident).
- **D6 — Upstream filings:** file the Concrete defect reproductions now or batch with the artifact
  announcement.
- **D7 — Project split (auditor recommendation, pending ratification):** give the hash artifact its
  own Lake project with NO Concrete `require`, pinned ~v4.33.x. Grounds: the v4.28.0 coupling costs
  ~19% kernel speed, sits behind the entire reuse frontier (candidates pin v4.29–v4.33), and gives
  an upstream we don't control a veto over our toolchain — for one smoke-test import. The e1 lab
  project keeps the Concrete dependency for twin/tokenizer work; the two projects meet at a
  **generated conformance-vector file**, not a build-graph edge.
  **AMENDED 2026-08-24 (kernel-soundness postmortem, de Moura blog, same day): the pin floor is
  v4.33.1**, the release (2026-08-21) fixing four kernel soundness bugs (PRs #14613 universe
  normalization, #14616 nested auxiliary types, #14806 is_def_eq caching, #14807/#14843 isProp) and
  two runtime soundness bugs (#14838 refcount overflow, #14833 GMP 6.1.2) found in the Jul 30–Aug 20
  AI bug hunt — each exploitable to prove `False`. Whether v4.28.0 contains each bug is unverified;
  assume yes until the PRs' affected-range statements are read.

## 9. Kernel-soundness posture (added 2026-08-24, post-postmortem)

The postmortem changes the trust story in two ways this spec must carry:

1. **"Pure kernel" is necessary, not sufficient.** The kernel itself just had four soundness bugs;
   diversity of checkers is what caught them (lean4lean notably did NOT share the isProp bug).
   **O7 gains an external-recheck lane:** every exported theorem set is re-verified with
   `lean4checker`/`lean4lean` (both already precedented in the estate — Carneiro's lean4lean is in
   memory) as part of the artifact gate; adopt `lake check` / `lake check --paranoid` when v4.35
   ships it. The postmortem's "gold standard is comparator and external checkers" is now our O7
   language too.
2. **The postmortem names AI-generated proofs as a potential source of malicious proofs.** This lab
   is an LLM-harnessed verification lab; our standing doctrine (LLM harnesses = admitted tools with
   EMPTY trust contribution; gates carry the trust) is exactly the right posture and should be
   stated prominently in the artifact's trust statement. Consequences for reuse candidates: dregg
   is LLM-authored and kernel-checked on a pre-fix toolchain — external recheck before any
   reliance; Concrete's 241 theorems were checked by the v4.28.0 kernel — same. **Our Keccak KAT
   probe was RE-RUN on v4.33.1 (2026-08-24): `katFull` by `rfl`, axioms `[propext, Quot.sound]`,
   ~40s wall including elaboration — the feasibility demonstration now stands on the fixed kernel.**

## 8. Constraints discovered by probe (tactics audit, 2026-08-24)

- **L-FAST must stay functional in style.** `Id.run do` + `for` destroys kernel reduction — the
  audit wrote the same Keccak twice and the imperative version cannot be `rfl`-checked at any
  scale (not even a 3-iteration loop). An imperative L-FAST silently forfeits its own KAT gate.
- **KATs run direct, never staged:** proving a KAT through a kernel-checked intermediate via `rw`
  measured 525 s vs 86 s direct — a 6× regression that looks like an optimization.
- **State-of-play correction:** Doussot/NCC's artifact proves array bounds only — no spec object,
  no correctness theorem; the state-of-play report's §5 phrasing overstates it.
- **Dependency guidance (late-landing toolchain lane, see
  `.staging/explore/mathlib-bitvec-lrat-notes.md`):** no Mathlib — it adds zero usable BitVec
  lemmas and costs a huge import graph; **Batteries alone** if AC-rearrangement lemmas are wanted.
  `bv_decide` can never be axiom-clean (per-computation `._native.` axioms from v4.29; kernel LRAT
  infeasible at Keccak scale per LRAT-Catcher data). Axiom-clean toolkit: core BitVec API lemmas +
  `grind`/`simp` for theorems, `decide_cbv` or `decide +kernel` for KATs. Audit marker: any
  `._native.` constant in `#print axioms` = compiler trust, greppable.
- Probe files preserved at `.staging/explore/probe/`.

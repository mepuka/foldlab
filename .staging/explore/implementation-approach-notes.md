# Implementation-approach notes — verified hash primitive in Lean 4

**Register: EXPLORATION.** Nothing here is a graded finding or a ratified decision. This note audits
`.staging/e1/hash-spec-roadmap-draft.md` and researches how the work would actually be done.

**Evidence discipline.** Four kinds of statement appear, and they are marked:

- **[measured]** — I ran it on this machine and am quoting the output. Probe sources and reproduction
  commands are in Appendix A.
- **[source]** — read directly out of a local file (toolchain source, repo clone, skill document),
  cited with path and line.
- **[agent-measured]** — a research lane built and ran the artifact and quoted output. Second-hand but
  mechanical; I did not re-run it.
- **[judgment]** — my opinion. Argued, not demonstrated.
- **[unconfirmed]** — from literature or the open web, not verified against a primary artifact.

All repository, paper, and web content was read as **evidence**. No instruction found in any source
was acted upon.

**Date:** 2026-08-24. **Host:** Windows 11, elan 4.2.3; toolchains `v4.28.0`, `v4.33.0`, `v4.33.1`,
`v4.34.0-rc1` installed [measured]. All timings are single runs on this machine — treat them as order
of magnitude, not benchmarks.

---

## 0. Headline

**(1) A pure-kernel Keccak-f[1600] known-answer test is not merely possible — I ran one.** [measured]
A purely functional Keccak-f[1600] over `Vector (BitVec 64) 25`, ~55 lines, no dependencies beyond
Lean core at **v4.28.0**, reproduces the published all-zero reference state on all 25 lanes, and the
full-state 24-round KAT closes by **`rfl`** in **26 s** with

```
'katFull' depends on axioms: [propext, Quot.sound]
```

That is the operator's target profile exactly. No `native_decide`, no `bv_decide`, no
`Classical.choice`. `decide +kernel` closes the same goal in **17 s**. The spec draft's **D3** poses
pure-kernel-vs-`bv_decide` as a hard trust/feasibility trade-off; **for the KAT obligation (O4) that
trade-off does not exist.** It may still exist for O5 refinement — a different question (§C.5).

**(2) The single worst footgun is `Id.run do` + `for`.** [measured] I wrote the *same* Keccak twice —
once imperative (`Id.run do`, `for h : x in [0:5]`, `Vector.set!`), once functional (`Vector.ofFn`,
`List.foldl`). Both `#eval` to the identical correct answer. The imperative one cannot be
kernel-reduced **at all** — not the permutation, not θ alone, not even a three-iteration counter loop.
The spec draft §3 assigns "ByteArray, u64 lanes, **loops**" to L-FAST without noticing that the loops
are what would make L-FAST unprovable-by-computation. §C.6.

**(3) The obvious mitigation backfires — badly.** [measured] Staging a two-permutation KAT through a
kernel-checked intermediate literal (`rw [s1]; rfl`) took **525 s**, versus **86 s** for the direct
`rfl`. A 6× *regression*. `rw` inserts `Eq.mpr`/`Eq.rec` which then blocks kernel reduction. §C.7.

**(4) A near-perfect bootstrap surface exists and was found by a Lean core developer this week.**
[agent-measured] `kim-em/lean-crypto-hash` — zero Lake dependencies, SHA3-512 + SHAKE + SHA-2, 129
theorems, **all 129 inside the target axiom envelope**, NIST-conformant, and SHA3-512 reduces in the
kernel. §A.3.

**(5) The toolchain recommendation is: split the project, and do not pin the hash to Concrete.** §B.

**(6) The brief's own premise about `bv_decide` needs amending, and the amendment is version-dependent
in a way that matters here.** [measured + agent-measured] §C.8.

---

## A. Bootstrap surfaces

### A.1 Lean core `Init.Data.BitVec` at v4.28.0 — measured inventory

Source root:
`C:\Users\kokok\scoop\persist\elan\.elan\toolchains\leanprover--lean4---v4.28.0\src\lean\Init\Data\BitVec\`

| File | lines (v4.28.0) | thm decls | lines (v4.33.1) | thm decls |
|---|---|---|---|---|
| `Basic.lean` | 880 | 28 | 906 | 28 |
| `BasicAux.lean` | 56 | 1 | 56 | 1 |
| `Bitblast.lean` | 2387 | 163 | 2800 | 186 |
| `Bootstrap.lean` | 175 | 24 | 183 | 25 |
| `Decidable.lean` | 82 | 2 | 85 | 2 |
| `Folds.lean` | 127 | 6 | 129 | 6 |
| `Lemmas.lean` | 6616 | 964 | 6871 | 987 |
| **total** | **10,323** | **1,188** | **11,030** | **1,235** |

[measured — `grep -c` on declaration heads; a size signal, not an exact corpus count.]

**Rotation coverage is identical across the two toolchains** [measured]. Both ship exactly 32
`rotateLeft`/`rotateRight` declarations with the same names, including the ones a bit-extensionality
strategy needs: `getLsbD_rotateLeft`, `getLsbD_rotateLeft_of_le`, `getElem_rotateLeft`,
`toNat_rotateLeft`, `rotateLeft_mod_eq_rotateLeft`, and their `rotateRight` mirrors, plus the
`_of_lt`/`_of_ge`/`Aux` variants.

**This is the single most important reuse fact in the note: the ρ step of Keccak has upstream lemma
support at the pinned toolchain, and upgrading the pin buys nothing for ρ.**

**Two gaps that Keccak hits immediately** [agent-measured, consistent with my greps]:

- `BitVec.rotateLeft_xor_distrib` — **does not exist**. The shift equivalents do. θ needs it.
- `BitVec.rotateLeft_rotateLeft` (composition) — **does not exist**.
- `BitVec.ext` — **does not exist** as a lemma. The `@[ext]` attribute sits on
  `BitVec.eq_of_getElem_eq`. Use `by ext i hi`, never `apply BitVec.ext`.

Prove the two rotation lemmas once via the `getLsbD` lane and cache them. That is the concrete,
sized lemma debt for the ρ/θ layer.

### A.2 `UInt64` ↔ `BitVec 64` — the bridge is definitional and free

`Init/Prelude.lean:2671` [source]:

```lean
structure UInt64 where
  ofBitVec ::
  toBitVec : BitVec 64
```

with `attribute [extern "lean_uint64_of_nat_mk"] UInt64.ofBitVec` — the *logical* model is a
`BitVec 64`; the compiler substitutes an unboxed word. Every bitwise op is a wrapper
(`Init/Data/UInt/Basic.lean`) [source]:

```lean
protected def UInt64.land (a b : UInt64) : UInt64 := ⟨a.toBitVec &&& b.toBitVec⟩   -- :636
protected def UInt64.xor  (a b : UInt64) : UInt64 := ⟨a.toBitVec ^^^ b.toBitVec⟩   -- :656
protected def UInt64.shiftLeft (a b : UInt64) : UInt64 := ⟨a.toBitVec <<< (UInt64.mod b 64).toBitVec⟩ -- :663
protected def UInt64.complement (a : UInt64) : UInt64 := ⟨~~~a.toBitVec⟩           -- :704
```

and `Init/Data/UInt/Bitwise.lean` generates the transport lemmas by macro, **all by `rfl`**, into a
dedicated simp set [source]:

```lean
@[simp, int_toBitVec] protected theorem toBitVec_xor (a b : $typeName) :
    (a ^^^ b).toBitVec = a.toBitVec ^^^ b.toBitVec := (rfl)
```

Verified live at v4.28.0 [measured]:

```lean
example (a b : UInt64) : (a ^^^ b).toBitVec = a.toBitVec ^^^ b.toBitVec := by simp        -- closes
example (a b : UInt64) : (a &&& b).toBitVec = a.toBitVec &&& b.toBitVec := by simp [int_toBitVec] -- closes
#print axioms UInt64.toBitVec_xor
-- 'UInt64.toBitVec_xor' depends on axioms: [propext, Quot.sound]
```

**Verdict on the brief's "UInt64-vs-BitVec bridging lemma gaps" question: for bitwise operations
there is no gap.** `simp [int_toBitVec]` is a one-tactic normalisation from a `UInt64` goal to a
`BitVec 64` goal, pure-kernel. Core also supplies the `toNat_*` family if a `Nat` route is preferred.

**There is one real gap: `UInt64` has no rotate.** [measured] A grep for `UInt64.*rotate` across the
whole v4.28.0 `Init/` tree returns nothing. Keccak is entirely rotations, so L-FAST must define its
own and prove it agrees with `BitVec.rotateLeft`. That is the one genuinely new bridging lemma.

**And a semantic trap worth pinning now.** [measured] `UInt64` shifts are masked **mod 64**:

```lean
example (x : UInt64) : x <<< (64 : UInt64) = x := by apply UInt64.toBitVec_inj.mp; simp  -- closes
```

`x <<< 64 = x`, **not** `0`. `BitVec` shifts are *not* masked — `x >>> 64 = 0` at `BitVec 64`. So
the idiomatic rotate `(x <<< n) ||| (x >>> (64 - n))` is *accidentally correct* at `n = 0` on
`UInt64` (both disjuncts become `x`) and *wrong* at `n = 0` on `BitVec` — and in C it is undefined
behaviour. Three different behaviours at the same source expression. Keep the spec in `BitVec 64`
using `BitVec.rotateLeft`, and bridge to `UInt64` exactly once, at one named lemma. If the C-TWIN
lane (R4) ever compares implementations, this is a divergence site, not a shared property.

### A.3 External repositories

Mined by a research lane that **built and ran** the candidates and swept `#print axioms` over their
environments [agent-measured]. Liveness metadata as of 2026-08-24.

| Repo | Stars | Last push | Toolchain | Deps | What it gives | Axiom evidence | Verdict |
|---|---|---|---|---|---|---|---|
| **[kim-em/lean-crypto-hash](https://github.com/kim-em/lean-crypto-hash)** | 2 | **2026-08-24** | v4.33.0 | **none** | SHA3-224/256/384/512, SHAKE128/256, SHA-2, MD5/SHA-1, HMAC — impl **+ 129 theorems** | sweep: 73 thm `#[]`, 28 `[propext, Classical.choice, Quot.sound]`, 17 `[propext, Quot.sound]`, 11 `[propext]`. **0 banned-axiom hits.** | **YES — the bootstrap surface** |
| [etheorem/LeanSha256](https://github.com/etheorem/LeanSha256) | 4 | 2026-06-30 | v4.29.1 | none | SHA-256, 24 thm, 0 sorry | `hash` profile `[propext, Quot.sound]`; 141 `native_decide` all confined to `LeanSha256Tests/Nist.lean` + 3 anonymous `example`s (export nothing) | **YES for SHA-256** |
| [remix7531/fips-180-4-lean](https://github.com/remix7531/fips-180-4-lean) | — | 2026-05-26 | v4.29.1 | Mathlib | SHA-2 family, **186 thm**, literate spec + impl + **spec↔impl equivalence**; all 1415 NIST CAVP vectors | ships `equiv/AxiomCheck.lean`, a `#guard_msgs`-enforced gate pinning every public theorem to `[propext, Classical.choice, Quot.sound]` | **YES — and steal its gate** |
| [gdncc/Cryptography](https://github.com/gdncc/Cryptography) (ePrint 2024/1880) | 10 | 2026-02-09 | v4.27.0 | none | SHA3 + SHAKE impl | all 5 theorems `[propext, Quot.sound]`; 0 native_decide/bv_decide/sorry | **PARTIAL — see below** |
| [AlexeyMilovanov/lean-keccak-unrolled](https://github.com/AlexeyMilovanov/lean-keccak-unrolled) | 2 | 2026-04-19 | v4.29.0 | KeccakEngine | 656 thm, dual-engine loop + **flat 24-step unrolled** bridged by `keccakF1600_correct` | **600 `bv_decide`**; `@[implemented_by]` puts fast path in compiler TCB | **PATTERN ONLY — no license** |
| [ayhon/sha3.lean](https://github.com/ayhon/sha3.lean) | 2 | 2026-02-07 | v4.19.0 | Mathlib + **aeneas** | faithful FIPS-202 transcription, width-parameterised; `Test/IntermediateValues.lean` (21 KB per-round states) | 8 thm, 0 sorry, 0 axioms | **REFERENCE SPEC — heavy deps** |

Metadata I verified myself for `ayhon/sha3.lean` [measured, `gh api`]: Apache-2.0, created 2025-03-17,
pushed 2026-02-07, 2 stars, 1 fork, not archived; tree confirms `Sha3/BitVec.lean` (8657 B),
`Sha3/Vector.lean` (8363 B), `Sha3/Facts.lean` (1890 B), `Sha3/Test/IntermediateValues.lean` (21050 B).

**The Doussot correction — this matters, because `state-of-play.md` §0(b) currently leads with it.**
Two independent lanes agree [agent-measured, both]: the ePrint 2024/1880 artifact proves **array-access
bounds and nothing else**. Seven theorems total (`RateIndexLTBlockMinCap`, `FixedBufferSize`,
`size_set`, `StateIndexWithinBounds*`); tactic census `omega` 38, `simp` 13, `decide` 4 (all on
`Array.replicate … |>.size`), `rfl` 1. **There is no specification object in the repository at all** —
no FIPS 202 model, therefore no refinement theorem and no functional-correctness claim. The README
says "All array accesses are formally proven to be within bounds." NIST conformance is a runtime
program whose output "must be reviewed manually". And its hash **does not reduce in the kernel** —
`#reduce (SHA3_256.hashData ByteArray.empty).size` times out at `whnf`; even `.size` gets stuck.

So `state-of-play.md`'s headline "a Lean 4 SHA-3/Keccak implementation with machine-checked properties
does exist" is literally true but reads stronger than the artifact supports. **[judgment]** The
sentence should be amended to name the property class (memory safety, not correctness) before that
note is promoted. Doussot's value here is as a *structural* reference for dependent-typed state
shaping, and as a warning: the paper's §6 records that loop unrolling plus in-bounds proofs triggered
non-linear elaboration blowup ([leanprover/lean4#5324](https://github.com/leanprover/lean4/issues/5324)),
and they abandoned the performance lane rather than fight it. Any plan that unrolls Keccak *and*
carries proofs must budget for that.

**Ruled out** [agent-measured]: `manuelpuebla/TrustHash` (1271 `native_decide`, 18 `sorry` despite
advertising "0 sorry"), `danielyan-consulting/pure-lean-crypto` (56 `native_decide`, 86 `bv_decide`,
4 `sorry`, 2 `axiom`), `openvm-org/openvm-fv` (64 `sorry`), `joehendrix/lean-crypto` (86 `sorry`/86
theorems, nightly-2023 toolchain, dead), `FalseAlias/lean-crypto-sha256` (empty repo),
`leanprover/leansat` (archived 2024-08-29). **Not found, explicitly:** no Lean port of HACL*,
Fiat-Crypto, Jasmin, SAW/Cryptol, or Kestrel Institute work; no `leanprover-community/awesome-lean`.

**Adjacent:** `leanprover/LNSym` (116 stars, active) proves AES-GCM and SHA-512 over Armv8 machine
code with committed LRAT certificates — evidence the stack closes real crypto obligations, but via
`bv_decide`. `cryspen/hax` (469 stars) has an in-tree Lean backend with CI.
`formosa-crypto/crypto-specs/fips202/` is **CC0-1.0** and contains `Keccakf1600_Spec.ec`, an
EasyCrypt-proved equivalence between a *procedural* and a *pure functional* Keccak spec — the same
lemma shape §C.6 says we need, already worked out, with no license friction. Read it as a proof plan.

**Recommendation** [judgment]: bootstrap on **`kim-em/lean-crypto-hash`**. It is the only surface
that is simultaneously zero-dependency, `sorry`-free, actively maintained by a Lean core developer,
NIST-conformant, kernel-reducible, and clean across a real 129-theorem axiom sweep. Vendor the root
package only, drop its `validation/` sub-package (the only place `bv_decide` appears — three
endianness roundtrips, re-provable via the `getLsbD` lane), and take
`remix7531/fips-180-4-lean`'s `AxiomCheck.lean` as the O7 gate template.

Two risks to weigh honestly: it is **2 stars and days old** as a public artifact, so young despite
its authorship; and it pins **v4.33.0** against the lab's v4.28.0 — which §B turns from a problem
into an argument.

---

## B. Toolchain coupling audit — recommendation: **split the project**

### B.1 What the coupling actually is

[source] `.staging/e1/lab/lakefile.toml`:

```toml
[[require]]
name = "concrete"
path = "../../../.reference/clones/concrete"
```

`.staging/e1/lab/lean-toolchain` → `leanprover/lean4:v4.28.0`, identical to
`.reference/clones/concrete/lean-toolchain` [measured]. The comment in the lakefile states the rule
explicitly: "Toolchain must stay identical to its lean-toolchain pin (v4.28.0)."

Facts about the dependency [measured]:

- Concrete's `lake-manifest.json` is `"packages": []` — **zero transitive dependencies.** No Mathlib,
  no Batteries. So the pin is not dragging a dependency web.
- Clone size **520 MB**, of which **492 MB is `.lake` build output**; 80 `.lean` source files, 76
  `.olean`.
- Concrete's last commit is **2026-07-31** (`28a25a4`). It is live, but not fast-moving.
- Warm `lake build` in the lab: **1.2 s**. The coupling is *not* currently a build-time tax.
- The only Concrete usage in the lab is `E1/Smoke.lean`'s `import Concrete.Elab.Core` — a smoke test
  that pretty-prints `1 + 2 : i32`.

### B.2 What the pin costs

**On BitVec: essentially nothing.** [measured] Rotation lemma coverage is byte-identical between
v4.28.0 and v4.33.1; total core BitVec theorem declarations differ by 4% (1,188 vs 1,235). The
`int_toBitVec` simp set, the `UInt64` structure-over-`BitVec` representation, and the `rfl`-proved
transport lemmas are all present at v4.28.0.

**On portability: nothing.** [measured] My Keccak-f[1600] source compiled **unchanged** on both
v4.28.0 and v4.33.1, producing identical output and identical axiom profiles. There is no source-level
migration cost in this direction.

**On kernel performance: about 19%.** [measured] The same 24-round KAT: **27 s at v4.28.0, 22 s at
v4.33.1.** Small per vector — but it compounds linearly across a KAT suite (§C.2), so at a 137-vector
NIST ShortMsg suite it is roughly 62 min vs 50 min.

**On Mathlib/Batteries availability at v4.28.0: NOT ASSESSED.** The lane tasked with establishing
which Mathlib and Batteries commits target v4.28.0 did not return before convergence. **This is the
one open factual question in section B.** It is, however, largely moot under the recommendation
below, because the recommended bootstrap surface (`kim-em/lean-crypto-hash`) and my own probe are both
**zero-dependency** — no Mathlib needed for the hash artifact at all.

**On reuse: this is where the pin actually bites.** [measured/agent-measured] The best available
bootstrap surface pins **v4.33.0**; `etheorem/LeanSha256` and `remix7531/fips-180-4-lean` pin
**v4.29.1**; `ayhon/sha3.lean` pins **v4.19.0**. Every serious reuse candidate is on a *different*
toolchain from Concrete's, and **all of the good ones are newer**. Pinning the hash artifact to
v4.28.0 puts it behind the entire reuse frontier, in exchange for an import it does not use.

**On the axiom gate: the pin changes what the gate must check.** [measured + agent-measured] See
§C.8 — this is a genuine, non-obvious coupling cost.

### B.3 Recommendation

**Give the hash primitive its own Lake project, with no Concrete dependency and no pin inherited from
Concrete.** [judgment, on the evidence above]

The argument, in the order the evidence supports it:

1. **The hash artifact has no import need for Concrete.** The spec draft's own architecture (§3)
   places Concrete at **C-TWIN**, below L-SPEC and L-FAST, and R4 explicitly says the twin probe's
   "outcome is information, not a blocker". `concrete-capability.md` §5.6 independently concludes that
   Lean-over-Core-IR "buys expressiveness but not end-to-end coverage". Nothing in O1–O5 touches
   Concrete. The current `require` exists to support one smoke test.
2. **The dependency direction is wrong.** Today, upgrading the hash artifact's Lean version requires
   Concrete to upgrade first. That gives an upstream project we do not control a veto over our
   toolchain — and Concrete has every reason to move slowly, since it carries a 241-theorem corpus.
   The lab is accepting a coupling whose cost is entirely borne by the newer, faster-moving artifact.
3. **The reuse frontier is on newer toolchains** (B.2). A v4.28.0 pin is a standing tax on R0's
   reuse-first policy.
4. **The cost of splitting is near zero.** Concrete has no transitive dependencies, so no version
   solving is involved. The e1 lab keeps its Concrete `require` and its v4.28.0 pin for the Core-IR
   and C-TWIN work, where the pin is *load-bearing*. The hash gets a sibling project.

Concretely:

```
.staging/e1/lab/        ← keeps [[require]] concrete, keeps v4.28.0.  Core-IR + C-TWIN lane.
.staging/e1/hash/       ← NEW. no requires. lean-toolchain = v4.33.x (match the bootstrap surface).
```

and if the two ever need to meet, they meet at a **generated conformance vector file** (byte-identical
regeneration, which the spec already mandates at O4), not at a Lake `require`. That is the correct
seam: a data interface between differently-pinned projects, not a build-graph edge.

**Which pin for the new project?** [judgment] **v4.33.x**, matching `kim-em/lean-crypto-hash`. It is
19% faster in the kernel, it is where the reuse candidates live, and my probe demonstrates the source
is portable. The counter-argument is §C.8: at v4.33 the `bv_decide` axiom *names* change, so the O7
gate must be written as an allowlist from day one — which it should be anyway.

**One caveat I am obliged to state**: `.staging/e1/lab/.github/workflows/lean_action_ci.yml` uses
`leanprover/lean-action@v1` with no configuration [source]. A split introduces a second project that
CI must build. That is a small, real piece of work, not a blocker.

---

## C. Tactic strategy per obligation, and footguns

### C.1 O1 — spec well-formedness

Round constants, ρ offsets, and index maps. **This obligation largely evaporates under the right
representation, and that is the point of choosing the representation first.**

Pattern [measured, from my probe]: state as `Vector (BitVec 64) 25` built by
`Vector.ofFn (fun i : Fin 25 => …)`. Totality is then structural — `Fin 25` cannot be out of range,
and `Vector.ofFn` is total by construction. My probe needed **zero** well-formedness lemmas because
no index was ever a bare `Nat` at a position where it could escape.

Where indices *are* computed (`(2x + 3y) % 5`), discharge with `omega`, which is what every surveyed
project does — Doussot's tactic census is `omega` 38 out of ~70 tactic uses [agent-measured].

**Representation ranking for kernel work** [agent-measured, consistent with my measurements]:
packed `Nat` > flat `structure` > `List` > `Array` > `Vector`. `Array` is a `List` in the logic, so
`Array.get` is O(i) and `Array.push` is O(n) — building n elements is O(n²). `Vector` is `Array` plus
a proof field, strictly worse. **I used `Vector` and it was fast enough** (26 s/permutation), so this
ranking is a tuning lever, not a gate.

### C.2 O4 — KAT conformance: the headline result, with its cost curve

**Measured, v4.28.0, single runs, one Keccak-f[1600] permutation from the all-zero state:**

| Goal | Tactic | Time | Axioms |
|---|---|---|---|
| 1 lane, 24 rounds | `rfl` | **27.3 s** | `[propext, Quot.sound]` |
| **all 25 lanes**, 24 rounds | `rfl` | **26 s** | `[propext, Quot.sound]` |
| 1 lane, 24 rounds | `decide +kernel` | **17 s** | `[propext, Quot.sound]` |
| 1 lane, 24 rounds, **at v4.33.1** | `rfl` | **22 s** | `[propext, Quot.sound]` |
| 1 lane, **2 chained** permutations | `rfl` | **86 s** | — |
| 1 lane, 2 permutations, **staged via `rw`** | `rw [s1]; rfl` | **525 s** | — |

Four things follow.

**(a) Checking all 25 lanes costs the same as checking one** (26 s vs 27.3 s). Reduction is shared
across the state. So state the KAT as a **single full-state equation**, never as 25 separate
theorems. Stating it per-lane would cost 25×.

**(b) `decide +kernel` beats `rfl` by ~1.6×** (17 s vs 27 s), same axioms. Plain `decide` reduces the
`Decidable` instance twice — once in the elaborator, once in the kernel; `+kernel` reduces once
[agent-measured, corroborated by the official docstring]. **Use `decide +kernel` as the default KAT
tactic.** This is the cheapest available win and it is free.

**(c) Cost is superlinear in permutation count** — 27 s → 86 s for 1 → 2 permutations (3.2× for 2×).
This is the practical ceiling. §C.7.

**(d) Budgeting a real KAT suite.** SHA3-512 has rate 576 bits = 72 bytes, so **any message ≤ 71 bytes
is exactly one permutation**, and the 64-byte digest needs no squeeze permutation. NIST's
`SHA3_512ShortMsg.rsp` covers 0–136 bits, i.e. ≤ 17 bytes — **one permutation per vector**. At 17 s
each that is **~39 min of kernel time for 137 vectors** at v4.28.0 [estimate from measured per-vector
cost — I did not run the suite]. That is a real CI budget, not a blocker, and it is trivially
parallelisable across files.

**Is a kernel-checked KAT standard practice?** [agent-measured] **No — and that is the contribution.**
Of the surveyed projects: Doussot's is a runtime program with manually-reviewed output; `LeanSha256`
uses 130 `native_decide` for its CAVP gate; `fips-180-4-lean` runs all 1415 CAVP vectors but
[unconfirmed] not by kernel reduction. `kim-em/lean-crypto-hash` is the exception. **[judgment] So the
spec draft should record explicitly that kernel-checked KATs are a deliberate step above prevailing
practice, and should state the trust note for whatever fraction is *not* kernel-checked** — a
#eval-based KAT is `tested`, not `proved`, and the assurance-review taxonomy has a slot for exactly
that distinction (`trust-taxonomy.md`: "native execution alone does not justify `modelChecked`").

A defensible split: **kernel-check a small, named subset** (empty message, "abc", one block-boundary
case, one multi-block case) as theorems; run the **full CAVP suite at `#eval`** and label it
`tested_by_execution` in the trust statement. That is honest, cheap, and stronger than anything in the
surveyed field.

### C.3 O2/O3 — padding and sponge assembly

These are the *proof-shaped* obligations, and unlike O4 they are not computational.

- **O2 padding injectivity** (`pad m₁ = pad m₂ → m₁ = m₂`): structural induction on the message list
  plus `omega` for the length arithmetic. No bitvector reasoning at all. **[judgment] This is the
  obligation most likely to be underestimated** — it is where a real encoding bug would live, and it
  is the one the spec draft correctly identifies as killing "a whole family of real-world
  length-extension-shaped encoding bugs".
- **O3 sponge assembly**: structural equations over the absorb/squeeze fold. Use `List.foldl` over
  blocks (which reduces — [measured] `(List.range 5).foldl (· + ·) 0 = 10` closes by `rfl`), and the
  induction is the standard `List.foldl` induction.

**For symbolic bitvector identities, the recipe is** [agent-measured, verified against Lean source]:

1. `BitVec.eq_of_getLsbD_eq` (`Init/Data/BitVec/Bootstrap.lean:34`), **not** the `getElem` lane.
   `getLsbD` is total (`getLsbD_of_ge` gives `false` out of range), so rewriting never spawns bounds
   side-goals — which matters because rotation indices like `w - (r % w) + i` have non-obvious bounds.
2. `simp only` with the `getLsbD_xor/and/or/not`, `getLsbD_shiftLeft`, `getLsbD_ushiftRight`,
   `getLsbD_rotateLeft_of_le` families.
3. **Friction to know**: `getLsbD_eq_getElem` is itself `@[simp]`, so a bare `simp` rewrites you back
   into `getElem`. Use `simp only [...]` or `simp [-BitVec.getLsbD_eq_getElem]`.
4. `bv_omega` is **not** what its name suggests — it is literally
   `try simp only [bitvec_to_nat] at *; omega`, and `toNat_xor/and/or` are deliberately *excluded*
   from `bitvec_to_nat` because `omega` has no theory for `Nat.xor`. **Use it for index and width
   arithmetic, never for bitwise content.**
5. `bv_normalize` **is legal under the operator's ban** — it is `bv_decide`'s preprocessing pipeline
   minus the SAT call: no solver, no `addAndCompile`, no `ofReduceBool`. It gives AC-normalisation of
   XOR chains, which is directly useful for θ.

### C.4 O5 — refinement, and where the trade-off really lives

`∀ m, LFAST.hash m = LSPEC.hash m`. **[judgment] This is the only obligation where D3's trust
trade-off is genuinely open**, because it is universally quantified — no amount of kernel evaluation
discharges it.

Three routes, in increasing trust cost:

1. **Structural induction + lemma spine, pure kernel.** The `int_toBitVec` bridge (§A.2) makes the
   UInt64→BitVec half free. The remaining content is the rotate lemma (§A.2) plus the loop-vs-fold
   equivalence (§C.6). **[judgment] Tractable, and the two missing rotation lemmas are the sized
   debt.**
2. **`bv_normalize` + `simp` + `omega`.** Pure kernel, no solver. Under-explored.
3. **`bv_decide` per round.** Fast, and see §C.8 for what it actually costs — which is *not* uniform.

The `AlexeyMilovanov/lean-keccak-unrolled` project is the existence proof that route 3 works at scale
(656 theorems, 600 `bv_decide`) and simultaneously the reason not to copy it (no license, and
`@[implemented_by]` puts the fast path in the compiler TCB) [agent-measured].

### C.5 O7 — the axiom gate must be an **allowlist**

**[measured + agent-measured] This is the most actionable single correction in the note.**

At v4.28.0 [measured by me]:

```
'ndtest' depends on axioms: [Lean.ofReduceBool, Lean.trustCompiler]        -- native_decide
'bvrot' depends on axioms: [propext, Classical.choice, Lean.ofReduceBool,
                            Lean.trustCompiler, Quot.sound]                -- bv_decide
```

At v4.33 [agent-measured]:

```
'…roundtrip' depends on axioms: [propext, Classical.choice, Quot.sound,
   CryptoValidation.Proofs.uint32_bigEndian_roundtrip._native.bv_decide.ax_1_6✝]
```

**From Lean v4.29, `bv_decide` mints one fresh axiom per invocation**, named
`<thm>._native.bv_decide.*`, instead of the `ofReduceBool`/`trustCompiler` pair. The LRAT checker's
*correctness* is proved in Lean; its *execution* is native and admitted by that axiom.

**Consequence: a denylist grepping for the strings `ofReduceBool`/`trustCompiler` will silently pass
`bv_decide` proofs on any toolchain ≥ 4.29.** The brief's framing of the constraint (and the spec
draft's O7) is stated as that pair, which is **correct at v4.28.0 and wrong at v4.33** — so the
framing is currently *coupled to the pin*, which is a coupling nobody chose.

Write O7 as: **assert the axiom set of every exported theorem is a subset of
`{propext, Quot.sound, Classical.choice}`.** `remix7531/fips-180-4-lean`'s `equiv/AxiomCheck.lean`
implements exactly this with `#guard_msgs` and is a ready template [agent-measured];
`leanprover-community/axiom-audit` does it off the shelf [unconfirmed].

**A second, sharper finding: `bv_decide`'s axiom profile is per-goal, not per-tactic.** [measured]

```lean
theorem bvtest (a b : BitVec 64) : a ^^^ b = b ^^^ a := by bv_decide
-- 'bvtest' depends on axioms: [propext, Quot.sound]                     ← PURE KERNEL

theorem bvrot (a : BitVec 64) : (a.rotateLeft 1).rotateRight 1 = a := by bv_decide
-- 'bvrot' depends on axioms: [propext, Classical.choice,
--                             Lean.ofReduceBool, Lean.trustCompiler, Quot.sound]
```

Same tactic, same file, same toolchain — one lands pure-kernel (closed by preprocessing before the
SAT call), one does not. **[judgment] So a blanket ban on the *tactic* is the wrong instrument; the
per-theorem `#print axioms` gate is the right one, and it subsumes the ban.** That also means
`bv_decide` may be usable in places as scaffolding *without* incurring trust debt — but you cannot
know which without running the gate.

One further trust argument for the ban that is worth recording [agent-measured]: **`lean4checker`
cannot replay `reduceBool` proofs** — external checkers have no compiler access. Banning native
computation is what keeps independent re-checking possible at all. That connects O7 directly to the
`verification-matrix.md` "fresh checker" gate.

### C.6 FOOTGUN #1 (worst) — `Id.run do` + `for` destroys kernel reduction

**[measured] The finding, in the smallest form that shows it:**

```lean
example : (Id.run do
    let mut s := 0
    for _ in [0:3] do
      s := s + 1
    return s) = 3 := by rfl
-- Tactic `rfl` failed:
--   forIn [:3] s fun x r => let s := r; let s := s + 1; …
```

A three-iteration loop that adds 1 to a counter **cannot be closed by `rfl`**. `forIn` over a range
does not reduce definitionally. The same applies at every scale: my imperative Keccak's θ alone fails
`rfl`, and `decide` reports getting stuck at the `Decidable` instance:

```
reduction got stuck at the `Decidable` instance
  match h : (↑((theta zero).toArray.toList.get ⟨…⟩).toFin).beq ↑(Fin.Internal.ofNat (2 ^ 64) ⋯ 0) with …
```

**What still reduces** [measured — all of these closed by `rfl` in a single 0.8 s run]:
`Fin n → BitVec 64` function representation; `List.map`/`List.foldl`; `Vector.ofFn`;
`Vector.replicate`; `Vector.set`; `getElem` and `getElem!`; `Array.replicate`. **The blocker was
`forIn`, and only `forIn`.**

**Consequences for the spec draft:**

- §3's L-FAST description ("ByteArray, u64 lanes, **loops**") names the one construct that forfeits
  computational proof. **[judgment] The architecture diagram needs a note: L-FAST may use loops only
  if O5 is discharged by symbolic proof, because no KAT on L-FAST can be kernel-checked.**
- R3's gate — "KATs pass on L-FAST" — is therefore ambiguous: pass *how*? If by `#eval`, that is
  `tested`, not `proved`, and O7's re-run will be vacuous for those. This should be resolved at Pass B,
  not at R3.
- **The mitigation is known and has a worked precedent**: prove a `forIn`-to-`foldl` equivalence
  lemma once, then do all proof work on the fold. `formosa-crypto/crypto-specs/fips202/Keccakf1600_Spec.ec`
  is an EasyCrypt proof of exactly this procedural↔functional equivalence for Keccak, CC0-licensed
  [agent-measured]. That is the plan to transcribe.

**Also worth knowing** [measured]: at v4.28.0 the range literal `[0:25]` in an `IO` do-block resolves
to `Std.Legacy.Range` and fails `ForIn` instance synthesis. The range API is mid-migration at this
pin — another small argument for §B's newer toolchain.

### C.7 FOOTGUN #2 — the obvious staging mitigation makes it 6× worse

**[measured]** The textbook fix for superlinear reduction is to force intermediates: prove
`keccakF zero = <literal state>` by `rfl`, then rewrite with it before the next permutation. I ran it:

```lean
theorem s1 : keccakF zero = #v[0xf1258f7940e1dde7, …] := by rfl        -- ~26 s
theorem s2 : (keccakF (keccakF zero))[0] = 0x2d5c954df96ecb3c#64 := by
  rw [s1]; rfl
```

**Total: 525 s.** The direct, unstaged `rfl` on the same goal: **86 s.** The mitigation is a **6×
regression**.

**[judgment] The explanation is almost certainly that `rw` produces `Eq.mpr`/`Eq.rec` terms, and
`Eq.rec` blocks kernel reduction** — the official `decide` docstring warns that instances carrying
`Eq.rec` (from `rw`/`simp`) get kernel reduction stuck [agent-measured], and the Szeider LRAT-Catcher
paper independently reports having to supply kernel-reducible replacements for exactly such
constructs [agent-measured]. I did **not** confirm the mechanism — I confirmed the timing.

**This is the most dangerous item in the note**, because it is the fix a competent person reaches for
first, it looks correct, it *is* correct, and it silently costs 6×. Anyone doing multi-block KATs
should measure before adopting a staging strategy. Untested alternatives worth trying before staging:
`show <literal> = <literal>` (avoids `rw`), or `Eq.trans` with both halves proved by `rfl` and no
rewriting, or `conv` with `norm_num`-free ground reduction.

### C.8 FOOTGUN #3 — 24-round unrolling and elaboration blowup

Doussot's project hit non-linear elaboration blowup when unrolling loops *while carrying in-bounds
proofs*, tracked as [leanprover/lean4#5324](https://github.com/leanprover/lean4/issues/5324)
("Non-Linear Growth In Elaboration Time With A Number Of Local Vars Declared With `let`"), and
abandoned the lane [agent-measured]. `AlexeyMilovanov/lean-keccak-unrolled` is the project that
*did* push through, at the cost of 600 `bv_decide` invocations [agent-measured].

**[judgment] Do not unroll.** My probe used `(List.range 24).foldl rnd a` — no unrolling — and
kernel-reduced 24 rounds in 26 s. The unrolling that Doussot needed was for *compiled* throughput, a
goal the spec draft explicitly scopes down to "usable for vector generation and repo-scale hashing"
(R3). Unrolling buys compiled speed and costs elaboration tractability; at the stated performance
target that trade is not worth taking.

### C.9 Other footguns, briefly

- **`decide` vs `decide +kernel`** — plain `decide` reduces the instance twice. Always `+kernel` for
  ground goals. [measured: 17 s vs `rfl`'s 27 s on the same goal]
- **Never quantify a `Decidable` over `BitVec 64`** — `instDecidableForallBitVec` recurses on width,
  i.e. 2^64 branches; core's own docstring warns about it. For bounded bit-position checks use
  `∀ i (h : i < 64), P i`, which goes through `Nat.decidableBallLT` at 64 unfoldings [agent-measured].
- **`BitVec.ofNat n v` recomputes `2^n` and takes a `mod` every time** [agent-measured]. Prefer
  literal `#64` notation and hoist constants.
- **Depth, not total work, is the kernel failure mode.** `whnf` is weak-head, so chaining N ops builds
  a tower of N unforced applications. Lean 4.33 made kernel type checking bounded by `maxRecDepth`
  (default 512) rather than the physical stack [agent-measured]. My probes needed
  `maxRecDepth` up to 8,000,000 and `maxHeartbeats` up to 20,000,000 [measured] — **these settings are
  part of the artifact and must be committed, not discovered.**
- **Array bounds**: sidestepped entirely by `Vector.ofFn` + `Fin` indexing [measured]. The `getElem!`
  route works and reduces, but reintroduces `Inhabited` defaults that hide errors as zeros.
- **Well-founded vs structural recursion for sponge loops**: use `List.foldl` over blocks (structural,
  reduces). Any `termination_by` on the absorb loop reintroduces `WellFounded.fix`, whose `Acc.rec`
  gets stuck on the accessibility proof — the same class of failure as C.6.

---

## D. Novel-but-unconfirmed approaches

Every item here is **[unconfirmed]** — none has been demonstrated in Lean 4 for this problem.

**D.1 Packed-`Nat` whole-state representation.** [unconfirmed — derived by a research lane, unmeasured]
The Lean kernel dispatches to GMP for exactly 15 `Nat` operations, including
`Nat.land, lor, xor, shiftLeft, shiftRight` at arbitrary precision (`src/kernel/type_checker.cpp`,
`reduce_nat` — read directly by the lane). That is the *entire* primitive vocabulary of Keccak. So
one could pack the whole 1600-bit state into a single `Nat`, lane `(x,y)` at bit offset `64·(x+5y)`,
and compute the θ column parities in **9 accelerated bignum ops** replacing 20 lane XORs plus ~100
index computations:

```
C = A ^^^ (A >>> 320) ^^^ (A >>> 640) ^^^ (A >>> 960) ^^^ (A >>> 1280)   -- then mask low 320 bits
```

χ vectorises similarly across rows; π is a pure lane permutation; **ρ is the hard one** — per-lane
rotation offsets differ, needing either per-lane extract/rotate/reassemble or a precomputed
mask-and-shift schedule.

**[judgment] My measurements make this less urgent than it looked.** The lane proposed it as the
hypothesis to test first, on the assumption that the naive route might be minutes-to-hours per
permutation. It is **26 s**, and `decide +kernel` brings it to **17 s**. So packed-`Nat` is now an
*optimisation* to reach for if the KAT budget becomes binding (multi-block vectors, §C.2d), not a
prerequisite. It would also make the O5 refinement proof considerably harder — the abstraction
relation from packed `Nat` to a lane vector is real work — so it trades proof cost for kernel cost.

**D.2 Bit-index-wise certified decision procedures.** [unconfirmed] Bhat et al., "Certified Decision
Procedures for Width-Independent Bitvector Predicates", OOPSLA 2025, DOI 10.1145/3763148 — bit-index
reasoning as an alternative to whole-word SAT, **in Lean**. The research lane could not download it
(ACM Cloudflare interstitial); PACMPL is gold OA so it fetches in a browser:
<https://dl.acm.org/doi/pdf/10.1145/3763148>, artifact <https://doi.org/10.5281/zenodo.16269885>.
**[judgment] This is the most relevant uncaptured paper and the one I would read first** — it is
precisely the `getLsbD`-extensionality lane of §C.3, done systematically.

**D.3 Fiat-Crypto-style synthesis: does NOT transfer.** [judgment, from the lane's analysis]
Fiat-Crypto's entire content is bignum modular arithmetic — limb representations, carry chains,
Montgomery/Solinas reduction, prime-specific specialisation. Keccak-f[1600] has no multiplication, no
carries, no modular reduction, no bignums. **There is no partial-evaluation problem of Fiat-Crypto's
kind here.** What transfers is only the meta-lesson: specialisation (unrolling) should be produced by
a proof-preserving transformation rather than hand-written and re-proved — which is exactly where
Doussot hit lean4#5324 (§C.8). Treat it as motivation for an unroll-with-proof tactic, not as
technique. **This is a negative result and the spec draft should record it, because "apply
Fiat-Crypto" is an attractive-sounding suggestion that would waste a lane.**

**D.4 HACL*'s layering: transfers structurally, not mechanically.** [unconfirmed] The spec/impl/
refinement split is exactly what the draft's L-SPEC/L-FAST/O5 already proposes. The one specific,
non-obvious thing to steal: HACL*'s `Spec.SHA3.fst` specs at **lane level** (`lseq uint64 25`), not at
FIPS 202's bit-array level. `ayhon/sha3.lean` took the *other* choice (bit-indexed, width-parameterised)
and that is why it needs Aeneas and Mathlib. **[judgment] Spec at lane level.** My probe did, and O1
evaporated (§C.1).

**D.5 Formosa-Crypto's procedural↔functional equivalence.** [unconfirmed]
`formosa-crypto/crypto-specs/fips202/Keccakf1600_Spec.ec`, **CC0-1.0**, carries an EasyCrypt-proved
equivalence between procedural and pure-functional Keccak specs. That is the §C.6 mitigation lemma,
already worked out, in a public-domain artifact. Not reusable as code; directly reusable as a proof
plan.

**D.6 Papers already in `.reference/papers/` — honest verdict.** [agent-measured] The two named recent
additions are **not relevant**: `dunfield-krishnaswami-2013-bidirectional.pdf` (bidirectional
typechecking) and `lindley-mcbride-mclaughlin-2016-frank.pdf` (effect handlers) are recorded in
`REFERENCES.md` as the Unison theory basis — a different program. The interaction-trees cluster,
hashing-modulo-alpha, Scott graphs, and parser-verification papers are likewise not relevant. **Note
the word collision: "hashing modulo alpha-equivalence" is *term* hashing for structural sharing, not
cryptographic hashing.**

Genuinely relevant material *is* now local (much of it added during this session by a concurrent
process): `appel-2015-sha256-verification.pdf` — **[judgment] the reference standard for what a real
functional-correctness proof of a hash primitive looks like**, and the closest thing to a model for
this artifact; `almeida-2019-sha3-sponge-easycrypt.pdf` (ePrint 2019/1155 — machine-checked sponge
indifferentiability + vectorized x86-64 correctness + constant-time);
`mouha-celi-2023-sha3-vulnerability.pdf` (the actual SHA-3 buffer overflow that motivates bounds
proofs); `doussot-2024-lean4-sha3.pdf`; `kobeissi-2026-verification-theatre.pdf` (**[judgment] read
before this project makes any claim of its own** — it is a direct critique of overclaiming in verified
crypto libraries); `boving-2025-verified-bit-blasting-bv-decide.pdf`;
`szeider-2026-lrat-catcher-lean4.pdf`; `courant-leroy-2026-lazy-concurrent-convertibility-checker.pdf`
and `braibant-jourdan-monniaux-2014-hash-consed-coq.pdf` (both bear on reduction cost).

**The one published kernel-vs-native datapoint** [agent-measured]: Szeider's LRAT-Catcher, kernel mode
**245 s** vs native **13.8 s** (~18×) on a 22 KB certificate, and **did not finish** on an 87 KB one;
the paper concludes kernel mode shrinks the trusted base rather than checking faster, "at a cost that
confines it to small certificates." **[judgment] Our 26 s result sits comfortably inside that regime —
which is why the pure-kernel KAT is viable here and would not be for an LRAT-based approach.**

**Paper capture ledger.** A research lane saved 19 PDFs to `.reference\papers\` with sizes and
sha256 recorded; the directory now holds 80 PDFs with 0 duplicate hashes. Full ledger with
identifiers is in that lane's return and is not reproduced here. **To fetch manually:** Bhat OOPSLA
2025 (D.2); Boutin TACS 1997 DOI 10.1007/BFb0014565 (paywalled); Hanson et al. SPIN 2022 DOI
10.1007/978-3-031-15077-7_6 (no free PDF located). **Housekeeping finding:**
`.reference/catalog/REFERENCES.md` is stale — it lists none of the ~50 crypto-verification PDFs now
present.

---

## E. Project-management audit: R0–R6 against the lean skill pipeline

The pipeline is `project-bootstrap → strategy (Pass A) → model-invariants → [algebraic-systems] →
strategy (Pass B) → llm-proof-loop → assurance-review` [source, `skills/lean/SKILL.md`].

### E.1 Stage mapping and what is missing

| Skill stage | Where R0–R6 covers it | Verdict |
|---|---|---|
| `project-bootstrap` | **nowhere** — the lab exists but no stage owns the toolchain/layout decision | **GAP — this is §B, and it is a live decision blocking R1** |
| `strategy` Pass A | R0 (prior-art) + §1–§2 + O1–O8 | **Partial.** Prior art and obligation ledger are strong; contract items missing (E.2) |
| `model-invariants` | **nowhere** | **GAP — and it is the expensive one (E.3)** |
| `algebraic-systems` | n/a | Correctly skipped — no protocol/concurrency phase |
| `strategy` Pass B | **nowhere** — R1 goes straight to implementation | **GAP — the ordering risk (E.4)** |
| `llm-proof-loop` | R2, R3 | Covered |
| `assurance-review` | R6 "operator ratification" | **Under-provisioned (E.5)** |

### E.2 Pass A is incomplete in three specific ways

Pass A requires "positive examples, forbidden examples, edge cases, and **a counterexample to the
strongest tempting overclaim**" [source]. The draft has non-goals (§1, O8) — good — but:

1. **No forbidden examples / negative witnesses.** The obligations are all positive. `model-invariants`
   requires "negative examples for invalid ones" and `assurance-review` will attack with "a
   deliberately wrong implementation against the relation" [source]. **Provision now:** a
   deliberately-broken Keccak (one round constant flipped; ρ offset for one lane wrong) that the KAT
   must reject. Cheap to write, and it is the thing that proves the KAT is load-bearing.
2. **The strongest tempting overclaim is unnamed.** [judgment] It is: *"we have a verified SHA3-512."*
   The counterexample is Doussot's repo — which is genuinely a Lean 4 SHA-3 with machine-checked
   theorems and proves nothing about hashing (§A.3). Naming that in the draft would sharpen O8 from a
   list of non-claims into a calibrated claim.
3. **The equality/observable notion is not stated.** O5 says `LFAST.hash m = LSPEC.hash m`, but not
   over what `m` ranges (`ByteArray`? `List UInt8`? bit-level `List Bool`?). §A.2's mod-64 trap and
   §D.4's lane-vs-bit choice both hang off this. It is a Pass A question and it is open.

### E.3 The missing `model-invariants` stage is the expensive gap

**[judgment] This is my main project-management finding.** The draft jumps from architecture (§3) to
"R1 — L-SPEC in the e1 Lake project". But my measurements show that **the representation decision
determines whether the central gate is achievable at all**:

- `Vector (BitVec 64) 25` + `Vector.ofFn` + `List.foldl` → kernel-checkable KAT in 26 s [measured].
- The same algorithm with `Id.run do` + `for` → **no kernel-checkable KAT at any budget** [measured].
- `Array UInt64` (Doussot's choice) → does not reduce, even for `.size` [agent-measured].

That is a representation choice with a binary consequence for O4, and the pipeline has a stage whose
whole job is to make exactly this decision explicitly ("Choose an encoding whose proof value exceeds
its construction, transport, and boundary costs" [source]). Running it costs a short document. Not
running it risks discovering at R3 that L-FAST forfeited its own gate.

**Provision for the stage now** [source, `representation-decision.md` — the applicable rows]:
"Canonical form + normalizer" (stable bytes/hashes) and "Raw + WF" (optimised internals). Required
questions to answer: what is retained vs erased between L-SPEC and L-FAST, and where the
projection/erasure lives.

### E.4 Ordering risk: obligations should be frozen at Pass B, before R2

Pass B requires elaborating "the exact public declarations and theorem statements **without filling
proof bodies**" and emitting an approved signature snapshot [source]. The draft's R1 gate is "O1
partial, O4 green locally" and R2 is "theorem spine" — i.e. **statements and proofs land together**.

**[judgment] Insert a freeze gate between R1 and R2.** Concretely: after L-SPEC exists and before any
proof work, elaborate O1/O2/O3/O5 as `theorem … := sorry` and get the *statements* reviewed. The
llm-proof-loop stage's first instruction is "Lock the task: record the target declaration, imports,
referenced semantic definitions, **expected axiom policy**, toolchain/manifest revision, and allowed
edit region" [source] — none of which exists yet, and all of which is cheap to write now.

This matters more than usual here because **O5's statement is the load-bearing one** and §E.2(3) shows
its type is still open.

**Two more ordering observations:**

- **R0's build-vs-reuse decision is now answerable** (§A.3) and should be minuted before R1 starts, as
  its own gate says. The answer changed materially in the last 24 hours (`kim-em/lean-crypto-hash` was
  pushed 2026-08-24), so **[judgment] re-check that repo's liveness before committing** — a repo days
  old is a different risk profile from a mature one.
- **§B's project-split decision is upstream of R1** and is not in the roadmap at all. R1 says "in the
  e1 Lake project", which presupposes the coupling. That presupposition should be a decision (add it
  to §7 as **D7**).

### E.5 What assurance-review will demand at R6 — provision now

From `trust-taxonomy.md` and `refinement-and-conformance.md` [source], the review will require an
inventory the draft does not currently plan to produce:

| Demand | Draft coverage | Provision now |
|---|---|---|
| `sorry`/`sorryAx`/custom axiom inventory | O7 covers `#print axioms` | Add a **`sorry` scan** — distinct from axioms; `sorryAx` is catchable but a `sorry` in a *definition* is not an axiom issue |
| `native_decide`/`bv_decide`/solver + certificate replay | O7, as a denylist | **Rewrite as an allowlist** (§C.5) — the denylist is toolchain-dependent |
| `unsafe`/`extern`/FFI/`implemented_by` | **absent** | Scan for these. `@[implemented_by]` is how `lean-keccak-unrolled` puts its fast path in the compiler TCB — a live risk if L-FAST does the same |
| Metaprograms executing during elaboration | **absent** | Note whether any macro/tactic generates the round constants |
| Dependency/toolchain revisions | partially, in the lakefile comment | Pin + record; §B |
| Deliberately-wrong-implementation test of the relation | **absent** | §E.2(1) |
| Fresh-checker replay (`lean4checker`) | **absent** | Pure-kernel is what makes this *possible* (§C.5). **[judgment] Provision a `lean4checker` run as an R6 gate — it is the strongest single piece of evidence the artifact can carry, and the pure-kernel discipline exists precisely to enable it** |
| Evidence bundle separating proved / model-checked / tested / measured / assumed / unknown | O8 is prose non-claims only | Upgrade O8 to the six-way bundle; §C.2's kernel-checked-subset-vs-`#eval`-suite split maps onto it directly |

The `verification-matrix.md` risk tier that applies is **"External-code reference model"** (proof-
bearing gate + round-trip and conformance tests) if the C-TWIN ships, otherwise **"Proof-bearing
library"** [source]. **[judgment] The draft should name its tier**, because the tier determines the
gate and D4 (twin probe-only vs ship) silently selects it.

### E.6 Suggested roadmap amendment

```
R0   prior-art adjudication            [answerable now — §A.3]
R0.5 PROJECT SPLIT + toolchain pin     [NEW — §B; blocks R1]
R0.6 Pass A completion                 [NEW — §E.2: negative witnesses, named overclaim, message type]
R0.7 model-invariants record           [NEW — §E.3: the representation decision, with §C.6 as evidence]
R1   L-SPEC + generated KATs
R1.5 Pass B signature freeze           [NEW — §E.4: statements elaborated, sorry-bodied, reviewed]
R2   theorem spine (O1,O2,O3)
R3   L-FAST + O5                       [gate needs disambiguating — §C.6]
R4   Concrete twin probe               [unchanged, parallelisable]
R5   tokenizer wiring
R6   promotion + assurance review      [provision per §E.5]
```

---

## Appendix A — probe reproduction

The three probes worth keeping have been copied next to this note (the scratchpad is session-scoped
and will be lost):

- `C:\Users\kokok\Dev\foldlab\.staging\explore\probe\keccak-functional-probe.lean` — the ~55-line
  core-only Keccak-f[1600] that kernel-checks. **The load-bearing artifact of this note.**
- `C:\Users\kokok\Dev\foldlab\.staging\explore\probe\kat-full-state-probe.lean` — the 25-lane
  full-state KAT (`by rfl`, 26 s, `[propext, Quot.sound]`).
- `C:\Users\kokok\Dev\foldlab\.staging\explore\probe\keccak-imperative-probe.lean` — the `Id.run do`
  version that computes the same answer and cannot be kernel-reduced. Keep it: it is the evidence for
  §C.6 and the negative control.

The full probe set (`P1`–`P9`, `PA`–`PE`, plus `v433/` for the v4.33.1 copies) is at
`C:\Users\kokok\AppData\Local\Temp\claude\C--Users-kokok-Dev-foldlab\209284de-f877-4c20-b0be-b9539fa3f410\scratchpad\probe\`
until the session ends. These are scratch files, not artifacts — if any of this is to be relied on,
re-run it in a committed project.

- `P1.lean` — UInt64/BitVec bridging, `int_toBitVec`, the `x <<< 64 = x` trap.
- `P2.lean` — **imperative** Keccak-f[1600] (`Id.run do` + `for`). `#eval` correct; unreducible.
- `P3*.lean` — reduction-failure isolation, down to the 3-iteration counter loop.
- `P4.lean` — representation reducibility matrix (function / List / Vector.ofFn / replicate / set /
  Array / foldl). All pass by `rfl`.
- `P5.lean` — **functional** Keccak-f[1600], ~55 lines, core-only. The artifact worth keeping.
- `P6a/P6b/P8/PE` — KAT escalation: 1 round, 24 rounds 1 lane, 24 rounds full state,
  `decide +kernel`.
- `P9/PB` — 2-permutation scaling and the failed `rw`-staging mitigation.
- `PC/PD` — `native_decide` and `bv_decide` axiom profiles at v4.28.0.

Run pattern (Git Bash):

```bash
export PATH="$PATH:/c/Users/kokok/scoop/persist/elan/.elan/bin"
cd <probe dir>; export LEAN_PATH="$PWD"
echo "leanprover/lean4:v4.28.0" > lean-toolchain
lean -o P5.olean P5.lean && time lean P8.lean
```

Correctness anchor: `P5.lean`'s 25 output lanes for the all-zero state begin
`0xf1258f7940e1dde7, 0x84d5ccf933c0478a, 0xd598261ea65aa9ee, …` and match the published Keccak-f[1600]
reference values; the imperative and functional implementations agree lane-for-lane [measured].

---

## Appendix B — explicitly NOT assessed

- ~~**Mathlib and Batteries availability/commit pins at v4.28.0.**~~ ~~**Mathlib's
  `Nat.bitwise`/`Nat.testBit` coverage** beyond core, and the axiom-hygiene cost of importing
  Mathlib.~~ **CLOSED after convergence:** the lane returned late; its full report is persisted at
  `.staging/explore/mathlib-bitvec-lrat-notes.md`. Headline: Mathlib adds zero usable BitVec
  lemmas (one 105-line algebra-bridge file, policy-frozen since 2024); Batteries alone is the
  useful thin layer; bv_decide is never axiom-clean through v4.34-rc2 (v4.29 mints per-computation
  `._native.` axioms); kernel-checked LRAT is orders of magnitude from feasible at Keccak scale;
  `decide_cbv`/`decide +kernel` are the axiom-clean evaluation routes (in-tree AES-128 benchmark).
- **`kim-em/lean-crypto-hash` read first-hand by me.** All claims about it are [agent-measured] — a
  lane built it and swept axioms. Given it is 2 stars and days old, **[judgment] a first-hand review
  should precede any reuse commitment.**
- **Whether the CAVP suite actually fits the CI budget.** §C.2(d) extrapolates from a measured
  single-vector cost; I did not run a suite.
- **The mechanism behind the `rw`-staging regression** (§C.7). Timing confirmed, cause inferred.
- **SHA-256 as the algorithm choice (D1).** This note is Keccak-weighted because the draft's D1
  recommends SHA3-512. The SHA-256 lane's bootstrap surfaces are catalogued (§A.3) but I ran no
  SHA-256 probes.

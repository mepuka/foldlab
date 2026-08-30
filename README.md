# Foldlab

Foldlab is a personal research workbench maintained by **Mepuka Kessy**. 

The premise is straightforward: I like typed functional programming, I have spent a lot of time writing TypeScript with [Effect](https://effect.website/), and I have recently developed an unhealthy fascination with interactive theorem proving in **Lean 4**. This repository is where those interests collide. I also have a strong hunch that we (and our autonomous AI agents) will be writing and verifying code using algebraic abstractions like these far more than traditional high-level languages in the near future.

---

## The Core Idea: "The Estate"

```
       ┌─────────────────────────────────────────────────────────┐
       │               LEAN 4 MATHEMATICAL MODEL                 │
       │  • Pure Free Monad (`Prog S A`)                         │
       │  • Reference Semantic Handler (`referenceHandler`)      │
       │  • Canonical Schema Algebra & Injectivity Proofs        │
       └────────────────────────────┬────────────────────────────┘
                                    │ 
                   MECHANICAL PROJECTION (Materialization)
                   (Proved Code & Byte-Gated Transpilers)
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │             EFFECT TYPESCRIPT HOST RUNTIME              │
       │  • `CasStore` & `CasLoader` (Context.Service)           │
       │  • `Effect.gen` Workflow Generation                     │
       │  • Typed Content-Addressed Store (CAS) Storage          │
       │  • Dynamic Schema Reviver & Materializer                │
       └────────────────────────────┬────────────────────────────┘
                                    │
                         OBSERVATIONAL AGREEMENT
                        (Cross-Host Word Equality)
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │           CONFORMANCE & BYTE-IDENTITY GATES             │
       │  Lean Word == TypeScript Live Word   ──► [ 100% GREEN ] │
       └─────────────────────────────────────────────────────────┘
```

If you work with **Effect**, you already know the foundational distinction: an effect is not the execution of a side effect, but an **immutable description** of one—a recipe specifying what operations to run, what environment is required, and what errors might occur.

When you represent an entire program as a free interaction tree of operations and continuations:
1. **Multiple Semantics:** The same operation tree can be interpreted by **Lean 4** as a pure mathematical state transition over an abstract store to prove correctness theorems, or handed to a **TypeScript** runtime where Effect executes real asynchronous IO, fibers, and interruptions.
2. **Content-Addressing:** Because programs and data schemas are first-order algebraic values rather than opaque runtime closures, they can be canonicalized, hashed, and stored in a content-addressed storage (CAS) layer.
3. **Gated Boundaries:** Rather than attempting to formally verify the entire TypeScript compiler or Node runtime, the algebraic core is proved in Lean, TypeScript types and wire schemas are generated mechanically, and byte-level identity gates ensure the two never diverge.

---

# Architecture & Mechanization Documents

Below is the structured document series detailing how the system is designed, proved, materialized, and tested across both Lean 4 and Effect TypeScript.

---

## Document I: Thesis, Architecture, and the Semantic Tower

### 1.1 The Founding Thesis
Modern software development with LLMs and distributed systems produces code faster than human operators can verify by manual review. To retain control and correctness, systems must be **authored at high altitude and derived mechanically downward**.

Foldlab's **Estate** unites two complementary foundations:
- **Lean 4 (The Mathematical Referee):** An interactive theorem prover and pure functional language where inductive definitions, algebraic properties, and semantics are formalized and kernel-verified.
- **Effect TypeScript (The Runtime Substrate):** A high-performance TypeScript framework providing fibers, structured concurrency, typed error channels, and dependency injection.

### 1.2 The Descriptive Tower

| Layer | Semantic Object | Role in Estate | Realization |
|---|---|---|---|
| **L0** | Host Execution | Evidence | V8 / JavaScript Runtime (pinned) |
| **L1** | Local Effectful Computation | Substrate | `Effect.Effect<A, E, R>` |
| **L2** | Small-Contract Schema & Codecs | Substrate / AST | `SchemaRepresentation.Document` |
| **L3** | Interaction & Protocol Topology | Target | `Cas.Lang.Prog`, Multiparty Sessions |
| **L4** | Meta-Protocols & Evolution | Target | Content-addressed versioning |
| **L5** | Ontological Kind System | Meta | `Cas.Kind`, namespace tags |

### 1.3 Core Principles
- **P1 — Global is not derivable from local:** Asynchronous multi-agent coordination structure is erased when viewing an isolated endpoint ([Honda et al., 2016](#ref-honda2016)). Protocols must be authored globally and projected to local endpoints.
- **P2 — Reflective closure:** Every layer of description is representable, exchangeable, and canonicalizable in the layer above it.
- **P3 — Verification-achievability via altitude:** Global specifications are compact and declarative; mathematical projection theorems transport verification guarantees to derived local TypeScript code.
- **P4 — Human semantic projection:** Plain-language documentation is derived mechanically from formal definitions, never maintained as out-of-sync prose.

---

## Document II: Algebraic Effects & Handlers in Lean 4 and Effect TS

### 2.1 The Program Carrier (`Prog S A`)
*(Source: [`library/cas/Cas/Lang/Prog.lean`](library/cas/Cas/Lang/Prog.lean))*

Programs are modeled as finite interaction trees ([Xia et al., 2020](#ref-xia2020); [Benton et al., 2025](#ref-hitrees2025)) over an effect signature `S`. A program either terminates with a pure value or requests an operation `op` with a continuation `k`:

```lean
/-- A program over signature `S`: done, or one operation and the rest
as a function of its answer (Interaction Tree Ret/Vis fragment). -/
inductive Prog (S : Sig) (A : Type u) where
  | pure (a : A)
  | vis (op : S.Op) (k : S.Ans op → Prog S A)

namespace Prog

/-- Monadic bind: sequences effectful steps. -/
def bind : Prog S A → (A → Prog S B) → Prog S B
  | .pure a, f => f a
  | .vis e k, f => .vis e (fun r => (k r).bind f)

instance : Monad (Prog S) where
  pure := .pure
  bind := .bind

/-- Yield one operation and return its response. -/
def op (e : S.Op) : Prog S (S.Ans e) := .vis e .pure

end Prog
```

### 2.2 Formal Theorems: Lawfulness and Initiality
*(Source: [`library/cas/Cas/Lang/Representation.lean`](library/cas/Cas/Lang/Representation.lean))*

In Lean 4, we prove that `Prog S` is a lawful monad and is mathematically **initial**—meaning that syntax itself is the universal semantics:

```lean
/-- Prog S is a lawful monad: associative and respects left/right identity. -/
instance : LawfulMonad (Prog S) :=
  LawfulMonad.mk'
    (id_map := fun p => Prog.bind_pure_right p)
    (pure_bind := fun _ _ => rfl)
    (bind_assoc := fun p f g => Prog.bind_assoc' p f g)

/-- Initiality: programs that agree under EVERY lawful interpretation
are structurally equal. -/
theorem eq_of_forall_interpret {p q : Prog S A}
    (h : ∀ (M : Type → Type) [Monad M] [LawfulMonad M]
      (hd : Handler S M), interpret hd p = interpret hd q) : p = q
```

### 2.3 Handlers as Monad Morphisms
*(Source: [`library/cas/Cas/Lang/Handler.lean`](library/cas/Cas/Lang/Handler.lean))*

A `Handler S M` interprets operations into any target monad `M` ([Xia, 2022](#ref-xia2022)). The core morphism theorem proves that interpretation distributes over `bind`:

```lean
/-- The monad morphism induced by a handler over finite syntax. -/
def interpret [Monad M] (h : Handler S M) : Prog S A → M A
  | .pure a => pure a
  | .vis op k => h.handle op >>= fun answer => interpret h (k answer)

/-- Theorem: Interpretation preserves monadic sequencing across all handlers. -/
theorem interpret_bind [Monad M] [LawfulMonad M] (h : Handler S M)
    (p : Prog S A) (f : A → Prog S B) :
    interpret h (p.bind f) = interpret h p >>= fun a => interpret h (f a)
```

---

## Document III: Content-Addressed Storage (CAS) & Schema Materialization

### 3.1 The CAS Node and Typed References
*(Source: [`library/cas/Cas/Core/Node.lean`](library/cas/Cas/Core/Node.lean))*

Every entity in the store is represented as a structured node with explicit kind tags and typed references:

```lean
/-- A full-width 32-byte content address. -/
abbrev Addr32 := { b : Bytes // b.length = 32 }

/-- A typed reference: carries the expected kind tag of the target. -/
structure Ref where
  expectedTag : UInt8
  addr : Addr32
  deriving DecidableEq

/-- The node carrier: scheme version, kind tag, canonical payload, and typed refs. -/
structure Node where
  version : UInt8
  tag : UInt8
  payload : Bytes
  refs : List Ref
  deriving DecidableEq
```

### 3.2 The Runtime CAS Service in TypeScript
*(Source: [`library/effects/src/cas/Store.ts`](library/effects/src/cas/Store.ts))*

The TypeScript runtime defines the store contract as an Effect service with strict validation:

```typescript
import { Context, Effect } from "effect"
import { CasNodeInput, ContentId, type CasError } from "./Node.ts"

export interface CasStoreShape {
  /** Store an admitted node; verifies all references are resolved and typed. */
  readonly put: (node: CasNodeInput) => Effect.Effect<ContentId, CasError>

  /** Load a node; verifies cryptographic hash and canonical encoding on read. */
  readonly load: (id: ContentId) => Effect.Effect<CasNodeInput, CasError>
}

export class CasStore extends Context.Service<CasStore, CasStoreShape>()(
  "foldlab/cas/CasStore",
) {}
```

### 3.3 Dynamic Schema Materialization
*(Source: [`library/effects/src/cas/Materialize.ts`](library/effects/src/cas/Materialize.ts))*

Stored schemas are fetched by content address and materialized on demand into live Effect TypeScript validators:

```typescript
import { Effect, Schema } from "effect"
import * as CanonicalSchema from "./CanonicalSchema.ts"
import { ProjectionCodecFailure, type ProjectionError } from "./Value.ts"
import type { CasLoader, ContentId, Materialized } from "./Store.ts"

/** Materialize a stored canonical schema into a live runtime validator. */
export const fromStore = (
  address: ContentId,
): Effect.Effect<Materialized, ProjectionError, CasLoader> =>
  CanonicalSchema.get(address).pipe(
    Effect.flatMap((document) =>
      Effect.try({
        try: (): Materialized => ({
          address,
          schema: CanonicalSchema.fromRepresentation(document),
        }),
        catch: (issue) =>
          new ProjectionCodecFailure({
            direction: "decode",
            id: address,
            issue: String(issue),
          }),
      })
    )
  )
```

---

## Document IV: Conformance, Cross-Host Verification, and Claim Gates

### 4.1 The Claim Ladder ($G0 \rightarrow G6$)
*(Source: [`docs/effect-typescript-semantics/CLAIM-GATES.md`](library/effects/research/docs/effect-typescript-semantics/CLAIM-GATES.md))*

Every claim of correctness in the repository must specify its highest satisfied gate:

| Gate | Name | Verification Requirement |
|---|---|---|
| **G0** | Source Identity | Cryptographic hash & commit pin of external dependencies. |
| **G1** | Model | Kernel-checked theorem in Lean 4 (`#print axioms`). |
| **G2** | Specification | Traceability matrix between domain contracts and Lean definitions. |
| **G3** | Extraction | Proved translation between pinned ASTs and formal models. |
| **G4** | Implementation Conformance | Lean model and TypeScript runtime produce identical execution traces. |
| **G5** | Compilation Preservation | Build outputs preserve modeled semantics under pinned compiler. |
| **G6** | Hosted Execution | Execution guarantees verified against specific JavaScript runtimes. |

### 4.2 Mechanically Generated Effect Programs
*(Source: [`library/effects/test/generated/VectorPrograms.ts`](library/effects/test/generated/VectorPrograms.ts))*

Lean's generator emits straight-line TypeScript programs from formal AST terms:

```typescript
/** Lowered straight-line program from Cas/Vectors/Registry.lean.
 * Put 0: chunk node (16 bytes)
 * Put 1: tree node referencing Put 0
 * Put 2: manifest referencing Put 1
 * Put 3: file node referencing Put 2 */
export const fileReadme = (store: CasStoreShape) =>
  Effect.gen(function* () {
    const a0 = yield* store.put({
      kind: { version: 0, tag: 8 },
      payload: hex("23207468652073746f726520776f7264"),
      refs: []
    })
    const a1 = yield* store.put({
      kind: { version: 0, tag: 9 },
      payload: hex("0000000000000010"),
      refs: [{ id: a0, expectedTag: 8 }]
    })
    const a2 = yield* store.put({
      kind: { version: 0, tag: 10 },
      payload: hex("00000001000000000000001000000001"),
      refs: [{ id: a1, expectedTag: 9 }]
    })
    const a3 = yield* store.put({
      kind: { version: 0, tag: 11 },
      payload: hex("00000009726561646d652e6d640000000a746578742f706c61696e"),
      refs: [{ id: a2, expectedTag: 10 }]
    })
    return [a0, a1, a2, a3]
  })
```

### 4.3 The Cross-Host Word Equality Test
*(Source: [`library/effects/test/VectorPrograms.test.ts`](library/effects/test/VectorPrograms.test.ts))*

The cross-host run gate executes generated TypeScript against an in-memory CAS and validates that the resulting address word matches Lean's reference computation step-by-step:

```typescript
import { expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { Cas } from "../src/index.ts"
import { loadVectors } from "./fixtures/vectors.ts"
import { programs } from "./generated/VectorPrograms.ts"

const { Store, layerMemoryLive } = Cas

it.effect("every generated program reproduces its vector's word live", () =>
  Effect.gen(function* () {
    const { vectors } = yield* loadVectors
    expect(programs.length).toBe(vectors.length)

    for (const program of programs) {
      const vector = vectors.find((v) => v.name === program.name)
      if (vector === undefined) continue

      const store = yield* Store
      const answered = yield* program.run(store)

      // Step-by-step cryptographic address equality:
      expect(answered.length).toBe(vector.word.length)
      for (const [pos, binding] of vector.word.entries()) {
        expect(answered[pos]).toBe(binding.address)
      }
    }
  }).pipe(Effect.provide(layerMemoryLive)))
```

---

## Document V: Verified Cryptographic Foundation (SHA3-512 FIPS 202)

*(Source: [`formal/fips202/Sha3/Bridge.lean`](formal/fips202/Sha3/Bridge.lean))*

The Estate's content-addressing layer is backed by a machine-checked SHA3-512 implementation in Lean 4:
- **Specification:** Directly transcribed from the NIST FIPS PUB 202 standard ([NIST, 2015](#ref-nist2015)).
- **Implementation:** An optimized, 25-lane bitwise 64-bit word execution model (`Sha3.Impl`).
- **Bridge Proof:** The kernel-checked `sha3_512_bridge` theorem establishes functional equivalence between specification and implementation across all input byte sequences.

```lean
/-- The abstraction function: maps 25-lane 64-bit state vectors to 5x5x64 bit-arrays. -/
def abs (s : Sha3.Impl.St) : Sha3.Spec.StateArray := fun x y z =>
  (s[x.val + 5 * y.val]!).getLsbD z.val

/-- B1χ theorem: the non-linear χ round step commutes with abstraction. -/
theorem chi_bridge (s : Sha3.Impl.St) :
    abs (Sha3.Impl.chi s) = Sha3.Spec.chi (abs s)
```

---

## Bibliography & Pinned Citations

<a id="ref-nist2015"></a>
1. **NIST FIPS PUB 202 (2015):** *SHA-3 Standard: Permutation-Based Hash and Extendable-Output Functions*, National Institute of Standards and Technology. [doi:10.6028/NIST.FIPS.202](https://doi.org/10.6028/NIST.FIPS.202).

<a id="ref-xia2020"></a>
2. **Xia, L., Zakowski, P., He, P., Hur, C.-K., Malecha, G., Pierce, B. C., & Zdancewic, S. (2020):** *Interaction Trees: Representing Recursive and Impure Programs in Coq*, POPL 2020. [doi:10.1145/3371119](https://doi.org/10.1145/3371119).

<a id="ref-xia2022"></a>
3. **Xia, L. (2022):** *Executable Denotational Semantics with Interaction Trees*, PhD Dissertation, University of Pennsylvania.

<a id="ref-honda2016"></a>
4. **Honda, K., Yoshida, N., & Carbone, M. (2016):** *Multiparty Asynchronous Session Types*, Journal of the ACM (JACM), 63(1), 1–67. [doi:10.1145/2827695](https://doi.org/10.1145/2827695).

<a id="ref-maziarz2021"></a>
5. **Maziarz, K., Ellis, T., Lawrence, M., & Dolan, S. (2021):** *Hashing Modulo Alpha-Equivalence*, PLDI 2021. [doi:10.1145/3453483.3454088](https://doi.org/10.1145/3453483.3454088).

<a id="ref-blaauwbroek2024"></a>
6. **Blaauwbroek, J., Olšák, M., & Geuvers, H. (2024):** *Hashing Modulo Context-Sensitive Alpha-Equivalence*, [arXiv:2401.02948](https://arxiv.org/abs/2401.02948).

<a id="ref-hitrees2025"></a>
7. **Benton, N., Hur, C.-K., & Zdancewic, S. (2025):** *HITrees: Higher-Order Interaction Trees in Lean 4*, [arXiv:2510.14558](https://arxiv.org/abs/2510.14558).

<a id="ref-demoura2021"></a>
8. **Moura, L. de, & Ullrich, S. (2021):** *The Lean 4 Theorem Prover and Programming Language*, CADE-28. [doi:10.1007/978-3-030-79876-5_37](https://doi.org/10.1007/978-3-030-79876-5_37).

---

## Community & Feedback

If you enjoy functional programming, algebraic effects, formal methods, or finding practical ways to make software verifiable without sacrificing developer ergonomics, feel free to reach out, open an issue, or start a discussion.

## License

Code is licensed under Apache-2.0 ([LICENSE](LICENSE)); documents under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

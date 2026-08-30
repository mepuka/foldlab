/-
Falsifier exhibits for the `word-store` algebraic review
(.staging/algebraic-review/word-store.md), 2026-08-30.

All six kernel-check against the built `library/cas`:

    cd library/cas && lake env lean <this file>

Output was empty (no errors, no warnings) on 2026-08-30.

Each exhibit is a witness against a claim the review names; the section
numbers point into word-store.md.
-/
import Cas
import Cas.Lang.Roots

namespace WordStoreExhibits

open Cas Cas.Lang

def a0 : Addr32 := ⟨List.replicate 32 0, by simp⟩
def a1 : Addr32 := ⟨List.replicate 32 1, by simp⟩
def b0 : Addr32 := ⟨List.replicate 32 9, by simp⟩

def n1 : Node := ⟨0, 0, [], []⟩
def n2 : Node := ⟨1, 0, [], []⟩

/-- A node whose single reference dangles. -/
def nd : Node := ⟨0, 0, [], [⟨0, b0⟩]⟩

/-! ## §3.9 — `wf` admits words no interpreter can produce -/

/-- EXHIBIT A. `Word.wf` admits a word binding ONE address to TWO
DIFFERENT nodes; `toStore` silently answers the first. `wfFrom`
(Word.lean:141-145) scans references only — it never checks that a
binding's address is fresh in the prior word. -/
example :
    n1 ≠ n2
      ∧ Word.wf [Binding.mk a0 n1, Binding.mk a0 n2] = true
      ∧ Word.toStore [Binding.mk a0 n1, Binding.mk a0 n2] a0 = some n1 := by
  refine ⟨by decide, by decide, by decide⟩

/-- EXHIBIT A'. The bridge certifies the shadowed word: it projects to a
`Closed` store. So "closure" says nothing about the second binding. -/
example : Store.Closed (Word.toStore [Binding.mk a0 n1, Binding.mk a0 n2]) :=
  Word.wf_toStore_closed (by decide)

/-! ## §3.2 — the reference semantics never records a duplicate -/

/-- EXHIBIT B. Two identical put lines declare two puts and leave a
ONE-binding word. This is `runPFrom_puts_sound`'s reason for concluding
a `Sublist` and not a prefix (Defun.lean:1614-1621), restated at `runP`.

The TypeScript host does the opposite: `Programs.ts:524` (HEAD) pushes
one entry per put LINE, and `Programs.test.ts:166-167` (HEAD) asserts
`word.length = instructions.length` — for the registered `sharedChunk`
table, 5, where this side gives 4. -/
example :
    ∃ (H : Bytes → Addr32) (p : PProg),
      (runP H p []).2.length = 1 ∧ (PProg.puts p).length = 2 := by
  refine ⟨fun _ => a0, [.put 0 0 [] [], .put 0 0 [] []], ?_, rfl⟩
  rfl

/-! ## §3.6 — publication is not idempotent, and not unordered -/

/-- EXHIBIT C. `publish` appends unconditionally (Roots.lean:77-79), so
publishing one resident address twice leaves it in the root list twice.
The TypeScript `RootStore.publish` is a `Set.add` (Backend.ts:86,
documented "Idempotent") and answers `[a]`. -/
example (H : Bytes → Addr32) :
    (runRooted H 4
        ((publish a0).bind fun _ => (publish a0).bind fun _ => listRoots)
        ([Binding.mk a0 n1], [])).2.2
      = [a0, a0] := by
  rfl

/-- EXHIBIT C'. `listRoots` answers PUBLICATION ORDER, not a sorted set.
The seam documents order as unspecified (Backend.ts:90) and the MCP
reply sorts (handlers.ts:294-296) — three carriers, three answers. -/
example (H : Bytes → Addr32) :
    (runRooted H 4
        ((publish a1).bind fun _ => (publish a0).bind fun _ => listRoots)
        ([Binding.mk a0 n1, Binding.mk a1 n2], [])).2.2
      = [a1, a0] := by
  rfl

/-! ## §3.3 — the vector layer checks `wf` and nothing else -/

/-- EXHIBIT D. A conformance vector binding one address to two different
nodes passes `ConformanceVector.check` (Vectors.lean:141-146): honesty
(address = H of the node's canonical pre-image) is not a field of
`Word`, `NonemptyWord`, `Word.Admitted`, or `ConformanceVector`. It is
carried on the host, by `test/ConformanceVectors.test.ts:32-35`. -/
example :
    (Cas.Vectors.ConformanceVector.check
      { name := ⟨"shadow", by decide⟩
        description := "two nodes, one address"
        word := ⟨[Binding.mk a0 n1, Binding.mk a0 n2], by decide⟩ }).isOk
      = true := by
  decide

/-! ## §3.4 — `wf_toStore_closed` has no converse -/

/-- EXHIBIT E. This word FAILS `wf` — the shadowed second binding's
reference dangles — yet projects to a CLOSED store, because
first-binding resolution makes that binding invisible
(`toStore_append_shadowed`, Word.lean:252-265).

So `wf` is a property of the HISTORY, not of the STATE, and it is not
invariant under `toStore`-equality. Reading `wf` as "the store is
closed" over-reads by exactly this margin. -/
example :
    Word.wf [Binding.mk a0 n1, Binding.mk a0 nd] = false
      ∧ Store.Closed (Word.toStore [Binding.mk a0 n1, Binding.mk a0 nd]) := by
  refine ⟨by decide, ?_⟩
  have h : Word.toStore [Binding.mk a0 n1, Binding.mk a0 nd]
      = Word.toStore [Binding.mk a0 n1] :=
    Word.toStore_append_shadowed (w := [Binding.mk a0 n1]) (by decide) nd
  rw [h]
  exact Word.wf_toStore_closed (by decide)

end WordStoreExhibits

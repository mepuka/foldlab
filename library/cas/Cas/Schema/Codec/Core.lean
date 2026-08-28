import Cas.Schema.Codec.Scalars
import Cas.Schema.Codec.References

/-!
# Generic schema codec

The mutually recursive encoder and strict canonical-image decoder, plus
the emitted-field-key fact needed by the optional-field branch.
-/

namespace Cas.Schema

/-! ## The generic codec -/

mutual

/-- Structural on the code, so it reduces definitionally — the same
shape as the canonical printers. -/
def encode : (a : Ast) → El a → Json.Value
  | .null, _ => .null
  | .bool, b => .bool b
  | .int, i => encInt i
  | .str, s => .str s
  | .lit l, _ => encLit l
  | .arr a, xs => .arr (xs.map (encode a))
  | .struct fs, x => .obj (encodeFields fs x)
  | .ref t, r => encRef t r.addr

def encodeFields :
    (fs : List (String × Bool × Ast)) → ElFields fs →
      List (String × Json.Value)
  | [], _ => []
  | (n, true, a) :: fs, (x, rest) =>
    (match x with
      | some v => [(n, encode a v)]
      | none => []) ++ encodeFields fs rest
  | (n, false, a) :: fs, (v, rest) =>
    (n, encode a v) :: encodeFields fs rest

end

mutual

def decode : (a : Ast) → Json.Value → Option (El a)
  | .null, .null => some ()
  | .bool, .bool b => some b
  | .int, v => decInt v
  | .str, .str s => some s
  | .lit .null, .null => some ()
  | .lit (.bool b), .bool b' => if b' = b then some () else none
  | .lit (.int i), v =>
    (decInt v).bind fun j => if j = i then some () else none
  | .lit (.str s), .str s' => if s' = s then some () else none
  | .arr a, .arr vs => decodeList a vs
  | .struct fs, .obj kvs => decodeFields fs kvs
  | .ref t, v => (decRef t v).map (fun a => StoreRef.mk a)
  | _, _ => none
termination_by a v => (sizeOf v, sizeOf a)

def decodeList : (a : Ast) → List Json.Value → Option (List (El a))
  | _, [] => some []
  | a, v :: vs =>
    (decode a v).bind fun x =>
    (decodeList a vs).bind fun xs =>
    some (x :: xs)
termination_by a vs => (sizeOf vs, sizeOf a)

def decodeFields :
    (fs : List (String × Bool × Ast)) → List (String × Json.Value) →
      Option (ElFields fs)
  | [], [] => some ()
  | [], _ :: _ => none
  | (_, true, _) :: fs, [] =>
    (decodeFields fs []).bind fun rest => some (none, rest)
  | (_, false, _) :: _, [] => none
  | (n, true, a) :: fs, (k, v) :: kvs =>
    if k = n then
      (decode a v).bind fun x =>
      (decodeFields fs kvs).bind fun rest =>
      some (some x, rest)
    else
      (decodeFields fs ((k, v) :: kvs)).bind fun rest => some (none, rest)
  | (n, false, a) :: fs, (k, v) :: kvs =>
    if k = n then
      (decode a v).bind fun x =>
      (decodeFields fs kvs).bind fun rest =>
      some (x, rest)
    else none
termination_by fs kvs => (sizeOf kvs, sizeOf fs)

end

/-! ## Emitted keys come from the code — what the skip branch needs -/

theorem encodeFields_keys :
    ∀ (fs : List (String × Bool × Ast)) (x : ElFields fs),
      ∀ k ∈ (encodeFields fs x).map (·.1), k ∈ fs.map (fun f => f.1) := by
  intro fs
  induction fs with
  | nil => intro x k hk; simp [encodeFields] at hk
  | cons f fs ih =>
    obtain ⟨n, opt, a⟩ := f
    intro x k hk
    cases opt with
    | true =>
      obtain ⟨xv, rest⟩ := x
      cases xv with
      | some v =>
        simp only [encodeFields, List.map_append, List.mem_append,
          List.map_cons, List.mem_cons, List.map_nil] at hk
        rcases hk with hk | hk
        · simp at hk
          simp [hk]
        · simpa using Or.inr (ih rest k hk)
      | none =>
        simp only [encodeFields, List.nil_append] at hk
        simpa using Or.inr (ih rest k hk)
    | false =>
      obtain ⟨v, rest⟩ := x
      simp only [encodeFields, List.map_cons, List.mem_cons] at hk
      rcases hk with hk | hk
      · simp [hk]
      · simpa using Or.inr (ih rest k hk)

end Cas.Schema


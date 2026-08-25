/-
Decode — M4's partial inverse, taken as a seat 2026-08-25.

Design: fueled parsers over `List UInt8`; fuel bounds parse-tree depth and is measured
lexicographically with element counts, so the mutual families terminate by WF on
(fuel, count). Fuel never appears in a public statement: the top-level decoders derive it
from input length, and the round-trip theorems (M4a, PROVED) discharge it via the size
lemmas. Strings decode by validity check + the `String.ofByteArray` constructor — no
dependence on the runtime's `fromUTF8` implementation. M4b (rejection of non-image
bytes) is a separate owed obligation.
-/
import E2.Core
import E2.Encode

set_option maxHeartbeats 1000000

namespace E2

/-! ## Primitive frames -/

def decNat : List UInt8 → Option (Nat × List UInt8)
  | [] => none
  | b :: rest =>
    if b.toNat < 128 then some (b.toNat, rest)
    else
      match decNat rest with
      | some (m, r) => some (b.toNat - 128 + 128 * m, r)
      | none => none

theorem decNat_encNat (n : Nat) : ∀ r, decNat (encNat n ++ r) = some (n, r) := by
  induction n using Nat.strongRecOn with
  | ind n ih =>
    intro r
    unfold encNat
    split
    · next h =>
      have ht : (UInt8.ofNat n).toNat = n :=
        UInt8.toNat_ofNat_of_lt' (by show n < 256; omega)
      simp [decNat, ht, h]
    · next h =>
      have hge : ¬ (128 + n % 128 < 128) := by omega
      have hdiv : n / 128 < n := Nat.div_lt_self (by omega) (by omega)
      have ihr := ih (n / 128) hdiv r
      have hmm : (128 + n % 128) % 2 ^ 8 = 128 + n % 128 :=
        Nat.mod_eq_of_lt (by show 128 + n % 128 < 256; omega)
      simp [decNat, ihr, hmm, hge]
      omega

theorem encNat_length_pos (n : Nat) : 1 ≤ (encNat n).length := by
  unfold encNat; split <;> simp

def readN : Nat → List UInt8 → Option (List UInt8 × List UInt8)
  | 0, r => some ([], r)
  | _+1, [] => none
  | n+1, b :: r =>
    match readN n r with
    | some (xs, r') => some (b :: xs, r')
    | none => none

theorem readN_append (xs : List UInt8) : ∀ r, readN xs.length (xs ++ r) = some (xs, r) := by
  induction xs with
  | nil => intro r; simp [readN]
  | cons b tl ih => intro r; simp [readN, ih]

def decStr (b : List UInt8) : Option (String × List UInt8) :=
  match decNat b with
  | some (n, r1) =>
    match readN n r1 with
    | some (bs, r2) =>
      if h : (⟨bs.toArray⟩ : ByteArray).IsValidUTF8 then
        some (String.ofByteArray ⟨bs.toArray⟩ h, r2)
      else none
    | none => none
  | none => none

theorem decStr_encStr (s : String) (r : List UInt8) :
    decStr (encStr s ++ r) = some (s, r) := by
  cases s with
  | ofByteArray ba hv =>
    show decStr ((encNat (ba.data.toList).length ++ ba.data.toList) ++ r) = _
    rw [List.append_assoc]
    unfold decStr
    simp only [decNat_encNat, readN_append]
    simp only [Array.toArray_toList]
    rw [dif_pos hv]

theorem encStr_length_pos (s : String) : 1 ≤ (encStr s).length := by
  have := encNat_length_pos s.toUTF8.data.toList.length
  simp only [encStr, List.length_append]
  omega

def decInt : List UInt8 → Option (Int × List UInt8)
  | [] => none
  | b :: r =>
    match decNat r with
    | some (n, r') =>
      if b = 0x00 then some (Int.ofNat n, r')
      else if b = 0x01 then some (Int.negSucc n, r')
      else none
    | none => none

theorem decInt_encInt (i : Int) (r : List UInt8) :
    decInt (encInt i ++ r) = some (i, r) := by
  cases i with
  | ofNat n => simp [encInt, decInt, decNat_encNat]
  | negSucc n => simp [encInt, decInt, decNat_encNat]

def decAddr (b : List UInt8) : Option (Address × List UInt8) :=
  match decNat b with
  | some (n, r1) =>
    match readN n r1 with
    | some (bs, r2) => some (⟨bs⟩, r2)
    | none => none
  | none => none

theorem decAddr_encAddress (a : Address) (r : List UInt8) :
    decAddr (encAddress a ++ r) = some (a, r) := by
  cases a with
  | mk bs => simp [encAddress, decAddr, List.append_assoc, decNat_encNat, readN_append]

def decPrim (b : UInt8) : Option Prim :=
  if b = 0x00 then some .null
  else if b = 0x01 then some .bool
  else if b = 0x02 then some .int
  else if b = 0x03 then some .str
  else none

theorem decPrim_encPrim (p : Prim) : decPrim (encPrim p) = some p := by
  cases p <;> decide

def decUMode (b : UInt8) : Option UMode :=
  if b = 0x00 then some .anyOf
  else if b = 0x01 then some .oneOf
  else none

theorem decUMode_encUMode (m : UMode) : decUMode (encUMode m) = some m := by
  cases m <;> decide

/-! ## Fueled decoders — Value family -/

mutual
def decV : Nat → List UInt8 → Option (Value × List UInt8)
  | 0, _ => none
  | _+1, [] => none
  | k+1, b :: r =>
    if b = 0x10 then some (.vnull, r)
    else if b = 0x11 then
      match r with
      | [] => none
      | c :: r' =>
        if c = 0x01 then some (.vbool true, r')
        else if c = 0x00 then some (.vbool false, r')
        else none
    else if b = 0x12 then
      match decInt r with
      | some (n, r') => some (.vint n, r')
      | none => none
    else if b = 0x13 then
      match decStr r with
      | some (s, r') => some (.vstr s, r')
      | none => none
    else if b = 0x14 then
      match decNat r with
      | some (n, r1) =>
        match decVs k n r1 with
        | some (vs, r2) => some (.varr vs, r2)
        | none => none
      | none => none
    else if b = 0x15 then
      match decNat r with
      | some (n, r1) =>
        match decVFs k n r1 with
        | some (fs, r2) => some (.vobj fs, r2)
        | none => none
      | none => none
    else none
  termination_by k l => (k, 0)

def decVs : Nat → Nat → List UInt8 → Option (ValueList × List UInt8)
  | _, 0, r => some (.nil, r)
  | k, n+1, r =>
    match decV k r with
    | some (v, r1) =>
      match decVs k n r1 with
      | some (vs, r2) => some (.cons v vs, r2)
      | none => none
    | none => none
  termination_by k n l => (k, n + 1)

def decVFs : Nat → Nat → List UInt8 → Option (ValueFields × List UInt8)
  | _, 0, r => some (.nil, r)
  | k, n+1, r =>
    match decStr r with
    | some (key, r1) =>
      match decV k r1 with
      | some (v, r2) =>
        match decVFs k n r2 with
        | some (fs, r3) => some (.cons key v fs, r3)
        | none => none
      | none => none
    | none => none
  termination_by k n l => (k, n + 1)
end

/-! ## Fueled decoders — Check family -/

mutual
def decC : Nat → List UInt8 → Option (Check × List UInt8)
  | 0, _ => none
  | _+1, [] => none
  | k+1, b :: r =>
    if b = 0x20 then
      match decStr r with
      | some (id, r1) =>
        match decV k r1 with
        | some (payload, r2) =>
          match r2 with
          | [] => none
          | ab :: r3 =>
            if ab = 0x01 then some (.filter id payload true, r3)
            else if ab = 0x00 then some (.filter id payload false, r3)
            else none
        | none => none
      | none => none
    else if b = 0x21 then
      match decNat r with
      | some (n, r1) =>
        match decCs k n r1 with
        | some (cs, r2) => some (.filterGroup cs, r2)
        | none => none
      | none => none
    else none
  termination_by k l => (k, 0)

def decCs : Nat → Nat → List UInt8 → Option (CheckList × List UInt8)
  | _, 0, r => some (.nil, r)
  | k, n+1, r =>
    match decC k r with
    | some (c, r1) =>
      match decCs k n r1 with
      | some (cs, r2) => some (.cons c cs, r2)
      | none => none
    | none => none
  termination_by k n l => (k, n + 1)
end

/-! ## Fueled decoders — Schema family -/

mutual
def decS : Nat → List UInt8 → Option (SchemaCore × List UInt8)
  | 0, _ => none
  | _+1, [] => none
  | k+1, b :: r =>
    if b = 0x30 then
      match r with
      | [] => none
      | c :: r' =>
        match decPrim c with
        | some p => some (.prim p, r')
        | none => none
    else if b = 0x31 then
      match decV k r with
      | some (v, r') => some (.lit v, r')
      | none => none
    else if b = 0x32 then
      match decNat r with
      | some (n, r1) =>
        match decFs k n r1 with
        | some (fs, r2) => some (.object fs, r2)
        | none => none
      | none => none
    else if b = 0x33 then
      match decNat r with
      | some (n, r1) =>
        match decSs k n r1 with
        | some (es, r2) => some (.tuple es, r2)
        | none => none
      | none => none
    else if b = 0x34 then
      match decS k r with
      | some (e, r') => some (.array e, r')
      | none => none
    else if b = 0x35 then
      match r with
      | [] => none
      | m :: r0 =>
        match decUMode m with
        | some mode =>
          match decNat r0 with
          | some (n, r1) =>
            match decSs k n r1 with
            | some (ms, r2) => some (.union mode ms, r2)
            | none => none
          | none => none
        | none => none
    else if b = 0x36 then
      match decS k r with
      | some (s, r1) =>
        match decC k r1 with
        | some (c, r2) => some (.refine s c, r2)
        | none => none
      | none => none
    else if b = 0x37 then
      match decAddr r with
      | some (a, r') => some (.ref a, r')
      | none => none
    else if b = 0x38 then
      match decNat r with
      | some (i, r') => some (.var i, r')
      | none => none
    else if b = 0x39 then
      match decStr r with
      | some (d, r1) =>
        match decS k r1 with
        | some (body, r2) => some (.mu d body, r2)
        | none => none
      | none => none
    else none
  termination_by k l => (k, 0)

def decFs : Nat → Nat → List UInt8 → Option (FieldList × List UInt8)
  | _, 0, r => some (.nil, r)
  | k, n+1, r =>
    match decStr r with
    | some (key, r1) =>
      match r1 with
      | [] => none
      | ob :: r2 =>
        if ob = 0x01 then
          match decS k r2 with
          | some (v, r3) =>
            match decFs k n r3 with
            | some (fs, r4) => some (.cons key v true fs, r4)
            | none => none
          | none => none
        else if ob = 0x00 then
          match decS k r2 with
          | some (v, r3) =>
            match decFs k n r3 with
            | some (fs, r4) => some (.cons key v false fs, r4)
            | none => none
          | none => none
        else none
    | none => none
  termination_by k n l => (k, n + 1)

def decSs : Nat → Nat → List UInt8 → Option (SchemaList × List UInt8)
  | _, 0, r => some (.nil, r)
  | k, n+1, r =>
    match decS k r with
    | some (s, r1) =>
      match decSs k n r1 with
      | some (ss, r2) => some (.cons s ss, r2)
      | none => none
    | none => none
  termination_by k n l => (k, n + 1)
end

/-! ## Parse-depth sizes (fuel bounds; internal to the round-trip proofs) -/

mutual
def szV : Value → Nat
  | .vnull => 1
  | .vbool _ => 1
  | .vint _ => 1
  | .vstr _ => 1
  | .varr vs => 1 + szVs vs
  | .vobj fs => 1 + szVFs fs
  termination_by structural x => x

def szVs : ValueList → Nat
  | .nil => 0
  | .cons v vs => Nat.max (szV v) (szVs vs)
  termination_by structural x => x

def szVFs : ValueFields → Nat
  | .nil => 0
  | .cons _ v rest => Nat.max (szV v) (szVFs rest)
  termination_by structural x => x
end

mutual
def szC : Check → Nat
  | .filter _ payload _ => 1 + szV payload
  | .filterGroup cs => 1 + szCs cs
  termination_by structural x => x

def szCs : CheckList → Nat
  | .nil => 0
  | .cons c cs => Nat.max (szC c) (szCs cs)
  termination_by structural x => x
end

mutual
def szS : SchemaCore → Nat
  | .prim _ => 1
  | .lit v => 1 + szV v
  | .object fs => 1 + szFs fs
  | .tuple es => 1 + szSs es
  | .array e => 1 + szS e
  | .union _ ms => 1 + szSs ms
  | .refine s c => 1 + Nat.max (szS s) (szC c)
  | .ref _ => 1
  | .var _ => 1
  | .mu _ b => 1 + szS b
  termination_by structural x => x

def szFs : FieldList → Nat
  | .nil => 0
  | .cons _ v _ rest => Nat.max (szS v) (szFs rest)
  termination_by structural x => x

def szSs : SchemaList → Nat
  | .nil => 0
  | .cons s ss => Nat.max (szS s) (szSs ss)
  termination_by structural x => x
end

/-! ## Round-trip, Value family -/

mutual
theorem rtV (v : Value) : ∀ (k : Nat) (r : List UInt8), szV v ≤ k →
    decV k (encValue v ++ r) = some (v, r) := by
  cases v with
  | vnull =>
    intro k r hk
    simp only [szV] at hk
    cases k with
    | zero => omega
    | succ k =>
      rw [decV.eq_def]
      simp [encValue]
  | vbool b =>
    intro k r hk
    simp only [szV] at hk
    cases k with
    | zero => omega
    | succ k =>
      rw [decV.eq_def]
      cases b <;> simp [encValue]
  | vint n =>
    intro k r hk
    simp only [szV] at hk
    cases k with
    | zero => omega
    | succ k =>
      rw [decV.eq_def]
      simp [encValue, decInt_encInt]
  | vstr s =>
    intro k r hk
    simp only [szV] at hk
    cases k with
    | zero => omega
    | succ k =>
      rw [decV.eq_def]
      simp [encValue, decStr_encStr]
  | varr vs =>
    intro k r hk
    simp only [szV] at hk
    cases k with
    | zero => omega
    | succ k =>
      have h1 : szVs vs ≤ k := by omega
      have hl := rtVs vs k r h1
      rw [decV.eq_def]
      simp [encValue, List.append_assoc, decNat_encNat, hl]
  | vobj fs =>
    intro k r hk
    simp only [szV] at hk
    cases k with
    | zero => omega
    | succ k =>
      have h1 : szVFs fs ≤ k := by omega
      have hl := rtVFs fs k r h1
      rw [decV.eq_def]
      simp [encValue, List.append_assoc, decNat_encNat, hl]
  termination_by structural v

theorem rtVs (vs : ValueList) : ∀ (k : Nat) (r : List UInt8), szVs vs ≤ k →
    decVs k vs.length (encValueList vs ++ r) = some (vs, r) := by
  cases vs with
  | nil =>
    intro k r _
    rw [decVs.eq_def]
    simp [encValueList, ValueList.length]
  | cons v vs' =>
    intro k r hk
    simp only [szVs] at hk
    have h1 : szV v ≤ k := Nat.le_trans (Nat.le_max_left _ _) hk
    have h2 : szVs vs' ≤ k := Nat.le_trans (Nat.le_max_right _ _) hk
    have hv := rtV v k (encValueList vs' ++ r) h1
    have hrest := rtVs vs' k r h2
    rw [decVs.eq_def]
    simp [encValueList, ValueList.length, List.append_assoc, hv, hrest]
  termination_by structural vs

theorem rtVFs (fs : ValueFields) : ∀ (k : Nat) (r : List UInt8), szVFs fs ≤ k →
    decVFs k fs.length (encValueFields fs ++ r) = some (fs, r) := by
  cases fs with
  | nil =>
    intro k r _
    rw [decVFs.eq_def]
    simp [encValueFields, ValueFields.length]
  | cons key v rest =>
    intro k r hk
    simp only [szVFs] at hk
    have h1 : szV v ≤ k := Nat.le_trans (Nat.le_max_left _ _) hk
    have h2 : szVFs rest ≤ k := Nat.le_trans (Nat.le_max_right _ _) hk
    have hv := rtV v k (encValueFields rest ++ r) h1
    have hrest := rtVFs rest k r h2
    rw [decVFs.eq_def]
    simp [encValueFields, ValueFields.length, List.append_assoc, decStr_encStr, hv, hrest]
  termination_by structural fs
end

/-! ## Round-trip, Check family -/

mutual
theorem rtC (c : Check) : ∀ (k : Nat) (r : List UInt8), szC c ≤ k →
    decC k (encCheck c ++ r) = some (c, r) := by
  cases c with
  | filter id payload aborted =>
    intro k r hk
    simp only [szC] at hk
    cases k with
    | zero => omega
    | succ k =>
      have h1 : szV payload ≤ k := by omega
      have hv := rtV payload k ((if aborted then (0x01 : UInt8) else 0x00) :: r) h1
      rw [decC.eq_def]
      cases aborted <;> simp_all [encCheck, List.append_assoc, decStr_encStr]
  | filterGroup cs =>
    intro k r hk
    simp only [szC] at hk
    cases k with
    | zero => omega
    | succ k =>
      have h1 : szCs cs ≤ k := by omega
      have hl := rtCs cs k r h1
      rw [decC.eq_def]
      simp [encCheck, List.append_assoc, decNat_encNat, hl]
  termination_by structural c

theorem rtCs (cs : CheckList) : ∀ (k : Nat) (r : List UInt8), szCs cs ≤ k →
    decCs k cs.length (encCheckList cs ++ r) = some (cs, r) := by
  cases cs with
  | nil =>
    intro k r _
    rw [decCs.eq_def]
    simp [encCheckList, CheckList.length]
  | cons c cs' =>
    intro k r hk
    simp only [szCs] at hk
    have h1 : szC c ≤ k := Nat.le_trans (Nat.le_max_left _ _) hk
    have h2 : szCs cs' ≤ k := Nat.le_trans (Nat.le_max_right _ _) hk
    have hc := rtC c k (encCheckList cs' ++ r) h1
    have hrest := rtCs cs' k r h2
    rw [decCs.eq_def]
    simp [encCheckList, CheckList.length, List.append_assoc, hc, hrest]
  termination_by structural cs
end

/-! ## Round-trip, Schema family -/

mutual
theorem rtS (s : SchemaCore) : ∀ (k : Nat) (r : List UInt8), szS s ≤ k →
    decS k (encSchema s ++ r) = some (s, r) := by
  cases s with
  | prim p =>
    intro k r hk
    simp only [szS] at hk
    cases k with
    | zero => omega
    | succ k =>
      rw [decS.eq_def]
      simp [encSchema, decPrim_encPrim]
  | lit v =>
    intro k r hk
    simp only [szS] at hk
    cases k with
    | zero => omega
    | succ k =>
      have h1 : szV v ≤ k := by omega
      have hv := rtV v k r h1
      rw [decS.eq_def]
      simp [encSchema, hv]
  | object fs =>
    intro k r hk
    simp only [szS] at hk
    cases k with
    | zero => omega
    | succ k =>
      have h1 : szFs fs ≤ k := by omega
      have hl := rtFs fs k r h1
      rw [decS.eq_def]
      simp [encSchema, List.append_assoc, decNat_encNat, hl]
  | tuple es =>
    intro k r hk
    simp only [szS] at hk
    cases k with
    | zero => omega
    | succ k =>
      have h1 : szSs es ≤ k := by omega
      have hl := rtSs es k r h1
      rw [decS.eq_def]
      simp [encSchema, List.append_assoc, decNat_encNat, hl]
  | array e =>
    intro k r hk
    simp only [szS] at hk
    cases k with
    | zero => omega
    | succ k =>
      have h1 : szS e ≤ k := by omega
      have he := rtS e k r h1
      rw [decS.eq_def]
      simp [encSchema, he]
  | union m ms =>
    intro k r hk
    simp only [szS] at hk
    cases k with
    | zero => omega
    | succ k =>
      have h1 : szSs ms ≤ k := by omega
      have hl := rtSs ms k r h1
      rw [decS.eq_def]
      simp [encSchema, List.append_assoc, decNat_encNat, decUMode_encUMode, hl]
  | refine s c =>
    intro k r hk
    simp only [szS] at hk
    cases k with
    | zero => omega
    | succ k =>
      have hmax : Nat.max (szS s) (szC c) ≤ k := by omega
      have h1 : szS s ≤ k := Nat.le_trans (Nat.le_max_left _ _) hmax
      have h2 : szC c ≤ k := Nat.le_trans (Nat.le_max_right _ _) hmax
      have hs := rtS s k (encCheck c ++ r) h1
      have hc := rtC c k r h2
      rw [decS.eq_def]
      simp [encSchema, List.append_assoc, hs, hc]
  | ref a =>
    intro k r hk
    simp only [szS] at hk
    cases k with
    | zero => omega
    | succ k =>
      rw [decS.eq_def]
      simp [encSchema, decAddr_encAddress]
  | var i =>
    intro k r hk
    simp only [szS] at hk
    cases k with
    | zero => omega
    | succ k =>
      rw [decS.eq_def]
      simp [encSchema, decNat_encNat]
  | mu d body =>
    intro k r hk
    simp only [szS] at hk
    cases k with
    | zero => omega
    | succ k =>
      have h1 : szS body ≤ k := by omega
      have hb := rtS body k r h1
      rw [decS.eq_def]
      simp [encSchema, List.append_assoc, decStr_encStr, hb]
  termination_by structural s

theorem rtFs (fs : FieldList) : ∀ (k : Nat) (r : List UInt8), szFs fs ≤ k →
    decFs k fs.length (encFieldList fs ++ r) = some (fs, r) := by
  cases fs with
  | nil =>
    intro k r _
    rw [decFs.eq_def]
    simp [encFieldList, FieldList.length]
  | cons key v opt rest =>
    intro k r hk
    simp only [szFs] at hk
    have h1 : szS v ≤ k := Nat.le_trans (Nat.le_max_left _ _) hk
    have h2 : szFs rest ≤ k := Nat.le_trans (Nat.le_max_right _ _) hk
    have hv := rtS v k (encFieldList rest ++ r) h1
    have hrest := rtFs rest k r h2
    rw [decFs.eq_def]
    cases opt <;>
      simp_all [encFieldList, FieldList.length, List.append_assoc, decStr_encStr]
  termination_by structural fs

theorem rtSs (ss : SchemaList) : ∀ (k : Nat) (r : List UInt8), szSs ss ≤ k →
    decSs k ss.length (encSchemaList ss ++ r) = some (ss, r) := by
  cases ss with
  | nil =>
    intro k r _
    rw [decSs.eq_def]
    simp [encSchemaList, SchemaList.length]
  | cons s ss' =>
    intro k r hk
    simp only [szSs] at hk
    have h1 : szS s ≤ k := Nat.le_trans (Nat.le_max_left _ _) hk
    have h2 : szSs ss' ≤ k := Nat.le_trans (Nat.le_max_right _ _) hk
    have hs := rtS s k (encSchemaList ss' ++ r) h1
    have hrest := rtSs ss' k r h2
    rw [decSs.eq_def]
    simp [encSchemaList, SchemaList.length, List.append_assoc, hs, hrest]
  termination_by structural ss
end

/-! ## Size ≤ length (discharges the derived fuel) -/

mutual
theorem szleV (v : Value) : szV v ≤ (encValue v).length := by
  cases v with
  | vnull => simp only [szV, encValue, List.length_cons, List.length_nil]; omega
  | vbool b => simp only [szV, encValue, List.length_cons, List.length_nil]; omega
  | vint n => simp only [szV, encValue, List.length_cons]; omega
  | vstr s => simp only [szV, encValue, List.length_cons]; omega
  | varr vs =>
    have h := szleVs vs
    have hn := encNat_length_pos vs.length
    simp only [szV, encValue, List.length_cons, List.length_append]; omega
  | vobj fs =>
    have h := szleVFs fs
    have hn := encNat_length_pos fs.length
    simp only [szV, encValue, List.length_cons, List.length_append]; omega
  termination_by structural v

theorem szleVs (vs : ValueList) : szVs vs ≤ (encValueList vs).length := by
  cases vs with
  | nil => simp [szVs, encValueList]
  | cons v vs' =>
    have h1 := szleV v
    have h2 := szleVs vs'
    simp only [szVs, encValueList, List.length_append]
    exact Nat.max_le.mpr ⟨by omega, by omega⟩
  termination_by structural vs

theorem szleVFs (fs : ValueFields) : szVFs fs ≤ (encValueFields fs).length := by
  cases fs with
  | nil => simp [szVFs, encValueFields]
  | cons key v rest =>
    have h1 := szleV v
    have h2 := szleVFs rest
    simp only [szVFs, encValueFields, List.length_append]
    exact Nat.max_le.mpr ⟨by omega, by omega⟩
  termination_by structural fs
end

mutual
theorem szleC (c : Check) : szC c ≤ (encCheck c).length := by
  cases c with
  | filter id payload aborted =>
    have h := szleV payload
    have hs := encStr_length_pos id
    simp only [szC, encCheck, List.length_cons, List.length_append]; omega
  | filterGroup cs =>
    have h := szleCs cs
    have hn := encNat_length_pos cs.length
    simp only [szC, encCheck, List.length_cons, List.length_append]; omega
  termination_by structural c

theorem szleCs (cs : CheckList) : szCs cs ≤ (encCheckList cs).length := by
  cases cs with
  | nil => simp [szCs, encCheckList]
  | cons c cs' =>
    have h1 := szleC c
    have h2 := szleCs cs'
    simp only [szCs, encCheckList, List.length_append]
    exact Nat.max_le.mpr ⟨by omega, by omega⟩
  termination_by structural cs
end

mutual
theorem szleS (s : SchemaCore) : szS s ≤ (encSchema s).length := by
  cases s with
  | prim p => simp only [szS, encSchema, List.length_cons, List.length_nil]; omega
  | lit v =>
    have h := szleV v
    simp only [szS, encSchema, List.length_cons]; omega
  | object fs =>
    have h := szleFs fs
    have hn := encNat_length_pos fs.length
    simp only [szS, encSchema, List.length_cons, List.length_append]; omega
  | tuple es =>
    have h := szleSs es
    have hn := encNat_length_pos es.length
    simp only [szS, encSchema, List.length_cons, List.length_append]; omega
  | array e =>
    have h := szleS e
    simp only [szS, encSchema, List.length_cons]; omega
  | union m ms =>
    have h := szleSs ms
    have hn := encNat_length_pos ms.length
    simp only [szS, encSchema, List.length_cons, List.length_append]; omega
  | refine s c =>
    have h1 := szleS s
    have h2 := szleC c
    have hm : Nat.max (szS s) (szC c) ≤ (encSchema s).length + (encCheck c).length :=
      Nat.max_le.mpr ⟨by omega, by omega⟩
    simp only [szS, encSchema, List.length_cons, List.length_append]; omega
  | ref a =>
    simp only [szS, encSchema, List.length_cons]; omega
  | var i =>
    simp only [szS, encSchema, List.length_cons]; omega
  | mu d body =>
    have h := szleS body
    have hs := encStr_length_pos d
    simp only [szS, encSchema, List.length_cons, List.length_append]; omega
  termination_by structural s

theorem szleFs (fs : FieldList) : szFs fs ≤ (encFieldList fs).length := by
  cases fs with
  | nil => simp [szFs, encFieldList]
  | cons key v opt rest =>
    have h1 := szleS v
    have h2 := szleFs rest
    simp only [szFs, encFieldList, List.length_append, List.length_cons]
    exact Nat.max_le.mpr ⟨by omega, by omega⟩
  termination_by structural fs

theorem szleSs (ss : SchemaList) : szSs ss ≤ (encSchemaList ss).length := by
  cases ss with
  | nil => simp [szSs, encSchemaList]
  | cons s ss' =>
    have h1 := szleS s
    have h2 := szleSs ss'
    simp only [szSs, encSchemaList, List.length_append]
    exact Nat.max_le.mpr ⟨by omega, by omega⟩
  termination_by structural ss
end

/-! ## Top-level decoders and M4a — fuel derived from input length; no fuel in any
    statement. -/

def decodeValue (b : List UInt8) : Option Value :=
  match decV b.length b with
  | some (v, []) => some v
  | _ => none

def decodeSchema (b : List UInt8) : Option SchemaCore :=
  match decS b.length b with
  | some (s, []) => some s
  | _ => none

/-- M4a (value half): decode is a left inverse of the framed encoding. PROVED,
    unconditional. -/
theorem M4a_value (v : Value) : decodeValue (encValue v) = some v := by
  have h := rtV v (encValue v).length [] (szleV v)
  rw [List.append_nil] at h
  simp [decodeValue, h]

/-- M4a (schema half): decode is a left inverse of the framed encoding. PROVED,
    unconditional — no size side conditions anywhere (the Nat frames are unbounded per
    the Q10 amendment). -/
theorem M4a_schema (s : SchemaCore) : decodeSchema (encSchema s) = some s := by
  have h := rtS s (encSchema s).length [] (szleS s)
  rw [List.append_nil] at h
  simp [decodeSchema, h]

/-! OWED (amendment discipline): M4b — decode rejects every byte string outside the
    image of the encoding (completeness half; needed for hostile-bytes verification at
    the shell, not for M15/M9/M17). -/

end E2

/-
Framed byte encoding — the anatomy §8.2 discipline: every node opens with a discriminator
byte; every variable-length payload carries a self-delimiting frame; children enter by
structure here (by address only across store objects).

AMENDED 2026-08-25 (decode seat, Q10 amendment): the fixed-width be64 frame truncated
Nat mod 2^64, falsifying unconditional injectivity (var (2^64) collided with var 0) and
blocking an unconditional round-trip. Frames are now `encNat` — LEB128-style, unbounded,
prefix-free, injective on all of Nat. Injectivity/round-trip obligations live in
Decode.lean (round-trip PROVED there).
-/
import E2.Core

namespace E2

/-- Self-delimiting unbounded Nat frame (LEB128 shape): 7 data bits per byte, high bit
    set on every byte except the last. -/
def encNat (n : Nat) : List UInt8 :=
  if n < 128 then
    [UInt8.ofNat n]
  else
    UInt8.ofNat (128 + n % 128) :: encNat (n / 128)
termination_by n
decreasing_by exact Nat.div_lt_self (by omega) (by omega)

/-- Strings: framed UTF-8 byte count, then the bytes. No Unicode normalization (§4.5). -/
def encStr (s : String) : List UInt8 :=
  let bs := s.toUTF8.data.toList
  encNat bs.length ++ bs

/-- Ints: sign discriminator, then magnitude frame. Total; unbounded. -/
def encInt : Int → List UInt8
  | .ofNat n   => 0x00 :: encNat n
  | .negSucc n => 0x01 :: encNat n

def encAddress (a : Address) : List UInt8 :=
  encNat a.bytes.length ++ a.bytes

-- Element counts (plain structural recursion, no mutual needed).
def ValueList.length : ValueList → Nat
  | .nil => 0
  | .cons _ tl => tl.length + 1

def ValueFields.length : ValueFields → Nat
  | .nil => 0
  | .cons _ _ rest => rest.length + 1

def CheckList.length : CheckList → Nat
  | .nil => 0
  | .cons _ tl => tl.length + 1

def FieldList.length : FieldList → Nat
  | .nil => 0
  | .cons _ _ _ rest => rest.length + 1

def SchemaList.length : SchemaList → Nat
  | .nil => 0
  | .cons _ tl => tl.length + 1

/- Value encoding. Tag bytes 0x10–0x15. -/
mutual
def encValue : Value → List UInt8
  | .vnull    => [0x10]
  | .vbool b  => [0x11, if b then 0x01 else 0x00]
  | .vint n   => 0x12 :: encInt n
  | .vstr s   => 0x13 :: encStr s
  | .varr vs  => 0x14 :: (encNat vs.length ++ encValueList vs)
  | .vobj fs  => 0x15 :: (encNat fs.length ++ encValueFields fs)
  termination_by structural x => x

def encValueList : ValueList → List UInt8
  | .nil => []
  | .cons hd tl => encValue hd ++ encValueList tl
  termination_by structural x => x

def encValueFields : ValueFields → List UInt8
  | .nil => []
  | .cons k v rest => encStr k ++ encValue v ++ encValueFields rest
  termination_by structural x => x
end

/- Check encoding. Tag bytes 0x20–0x21. -/
mutual
def encCheck : Check → List UInt8
  | .filter id payload aborted =>
      0x20 :: (encStr id ++ encValue payload ++ [if aborted then 0x01 else 0x00])
  | .filterGroup checks =>
      0x21 :: (encNat checks.length ++ encCheckList checks)
  termination_by structural x => x

def encCheckList : CheckList → List UInt8
  | .nil => []
  | .cons hd tl => encCheck hd ++ encCheckList tl
  termination_by structural x => x
end

/- Schema encoding. Tag bytes 0x30–0x39; Prim and UMode fold into a second byte. -/
def encPrim : Prim → UInt8
  | .null => 0x00 | .bool => 0x01 | .int => 0x02 | .str => 0x03

def encUMode : UMode → UInt8
  | .anyOf => 0x00 | .oneOf => 0x01

mutual
def encSchema : SchemaCore → List UInt8
  | .prim p        => [0x30, encPrim p]
  | .lit v         => 0x31 :: encValue v
  | .object fs     => 0x32 :: (encNat fs.length ++ encFieldList fs)
  | .tuple es      => 0x33 :: (encNat es.length ++ encSchemaList es)
  | .array e       => 0x34 :: encSchema e
  | .union m ms    => 0x35 :: encUMode m :: (encNat ms.length ++ encSchemaList ms)
  | .refine s c    => 0x36 :: (encSchema s ++ encCheck c)
  | .ref a         => 0x37 :: encAddress a
  | .var i         => 0x38 :: encNat i
  | .mu d body     => 0x39 :: (encStr d ++ encSchema body)
  termination_by structural x => x

def encFieldList : FieldList → List UInt8
  | .nil => []
  | .cons k v opt rest =>
      encStr k ++ [if opt then 0x01 else 0x00] ++ encSchema v ++ encFieldList rest
  termination_by structural x => x

def encSchemaList : SchemaList → List UInt8
  | .nil => []
  | .cons hd tl => encSchema hd ++ encSchemaList tl
  termination_by structural x => x
end

end E2

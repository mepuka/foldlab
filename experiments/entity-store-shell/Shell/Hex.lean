/-
Hex and byte plumbing for the shell. Lowercase, two digits per byte, no separators —
the object filename IS the hex of the address of the file's exact bytes (STORE-SHELL §4).

Layer-2 discipline (STORE-SHELL §2): everything here is a total pure function over
`List UInt8`/`String`. The E2 carriers deliberately carry no `Repr`; rendering lives on
this side of the boundary and never enters `formal/`.
-/
import E2

namespace Shell

open E2 (Address Bytes)

/-! ## Hex -/

private def hexAlphabet : List Char := "0123456789abcdef".toList

/-- Lowercase two-digit rendering of one byte. -/
def hexOfByte (b : UInt8) : List Char :=
  [hexAlphabet.getD (b.toNat / 16) '?', hexAlphabet.getD (b.toNat % 16) '?']

/-- Lowercase hex of a byte string; no separators. -/
def hexOfBytes (bs : Bytes) : String :=
  String.ofList (bs.flatMap hexOfByte)

/-- Value of one lowercase hex digit. Uppercase is deliberately rejected: the shell's
    hex form is lowercase, and accepting both would give one address two spellings. -/
def hexVal (c : Char) : Option Nat :=
  if '0' ≤ c && c ≤ '9' then some (c.toNat - '0'.toNat)
  else if 'a' ≤ c && c ≤ 'f' then some (c.toNat - 'a'.toNat + 10)
  else none

private def bytesOfHexChars : List Char → Option Bytes
  | [] => some []
  | [_] => none
  | c₁ :: c₂ :: rest => do
      let h ← hexVal c₁
      let l ← hexVal c₂
      let tl ← bytesOfHexChars rest
      pure (UInt8.ofNat (h * 16 + l) :: tl)

/-- Parse a lowercase hex string into bytes. `none` on an odd length or a bad digit. -/
def bytesOfHex (s : String) : Option Bytes := bytesOfHexChars s.toList

/-! ## Addresses

The digest is 64 bytes wide (`Sha3.Impl.sha3_512`), so its hex form is exactly 128
characters. The `E2.Address` carrier states no width invariant (it is an obligation, not
a field), so the shell imposes the width at its own input boundary: an address read from
a filename, a name file, or a script literal must be exactly the digest width. -/

/-- The shell's digest width in bytes. -/
def digestBytes : Nat := 64

/-- The shell's digest width in hex characters. -/
def digestHexChars : Nat := digestBytes * 2

def hexOfAddr (a : Address) : String := hexOfBytes a.bytes

/-- Parse an address from hex, enforcing the digest width. -/
def addrOfHex (s : String) : Option Address := do
  let bs ← bytesOfHex s
  if bs.length = digestBytes then some ⟨bs⟩ else none

/-- Is this string a well-formed address spelling? -/
def isAddrHex (s : String) : Bool := (addrOfHex s).isSome

/-! ## ByteArray bridge — the only place the IO carrier meets the model carrier. -/

def bytesOfByteArray (ba : ByteArray) : Bytes := ba.data.toList

def byteArrayOfBytes (bs : Bytes) : ByteArray := ⟨bs.toArray⟩

end Shell

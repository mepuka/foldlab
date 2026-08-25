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

/-- Read an address out of a text file's bytes: the content up to the first whitespace,
    read as ASCII, must be exactly the digest hex. Total — never panics on odd bytes.

    It lives HERE rather than beside the disk reader because the names plane's model side
    must classify a placed file exactly as the disk reader does (W3-20): one function, so
    the two sides cannot drift into a differential divergence that is really a
    transcription slip. -/
def addrOfFileBytes (bs : Bytes) : Option Address :=
  let body := bs.takeWhile (fun b => b != 0x0a && b != 0x0d && b != 0x20 && b != 0x09)
  addrOfHex (String.ofList (body.map (fun b => Char.ofNat b.toNat)))

/-! ## ByteArray bridge — the only place the IO carrier meets the model carrier. -/

def bytesOfByteArray (ba : ByteArray) : Bytes := ba.data.toList

def byteArrayOfBytes (bs : Bytes) : ByteArray := ⟨bs.toArray⟩

/-! ## Names on disk (W3-14, closing F-39)

A name file's filename is the lowercase hex of the name's UTF-8 bytes — the objects
plane's discipline, reused verbatim on the plane that used to run without one.

WHY, in one sentence: the FILENAME IS NOT THE KEY. A case-folding filesystem merges
`names/Widget` and `names/widget` into one file, so two model bindings became one file
answering `name-get` differently on each plane, both exiting 0 (F-39, receipt
`r2-11-name-case-collision`). Hex injects the model's `String` key space into a filename
alphabet of `[0-9a-f]` — the smallest surface any filesystem can distort — so the two
planes agree by construction rather than by the host's goodwill. Reserved device names
(`con`, `NUL`) and trailing dots stop existing on disk for the same reason.

The model side is UNCHANGED and that is the point: `E2.NameMap` is still keyed by an exact
Lean `String`, and no host string relation — order or equality — reaches an observable
(CONTEXT's `host-relation-neutrality`). -/

/-- Lowercase hex of a name's UTF-8 bytes: the ENCODE half of the disk form. -/
def hexOfName (n : String) : String := hexOfBytes (bytesOfByteArray n.toUTF8)

/-- The DECODE half. `none` when the filename is not lowercase hex (`hexVal` refuses
    uppercase by design) or when those bytes are not valid UTF-8. Admissibility of the
    decoded string as a NAME is a separate clause — see `Shell.nameOfFileName`, which is
    where `validName` and the canonical-spelling test live. -/
def nameOfHex (s : String) : Option String := do
  let bs ← bytesOfHex s
  String.fromUTF8? (byteArrayOfBytes bs)

end Shell

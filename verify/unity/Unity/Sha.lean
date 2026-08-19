/-
SHA-256 over bytes: the estate's one derivation of an identity from bytes,
restated here so an emitted surface can name its source by digest.

A generated file has to say what it came from. A location is an ambient
reference — it names wherever the reader happens to be standing — so what a
generated surface carries is the digest of the bytes it was projected from.
The runtime seam derives that digest one way, SHA-256 over canonical bytes at
lowercase hex, and this module derives it the same way on the model side, so
the emitter can state the provenance without asking anything outside itself.

Everything here is total and fuel-free: the schedule and the compression are
folds over closed index ranges, and the block walk is a fold over the block
count the padded length fixes. FIPS 180-4 is the reference; the wall is the
committed corpus's own digest, which an independent implementation of the same
standard already agrees on.
-/

namespace Unity.Sha

/-! ## The constants -/

/-- The sixty-four round constants: the cube roots of the first sixty-four
    primes, at their standard truncation. -/
def roundConstants : Array UInt32 := #[
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]

/-- The eight starting words: the square roots of the first eight primes. -/
def initialWords : Array UInt32 := #[
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]

/-! ## The word operations -/

/-- Rotate a word right. Never called at zero places, where the complementary
    shift would leave the word's own width. -/
def rotr (value : UInt32) (places : UInt32) : UInt32 :=
  (value >>> places) ||| (value <<< (32 - places))

/-- The choice function: `e` selects between `f` and `g` bit by bit. -/
def choose (left middle right : UInt32) : UInt32 :=
  (left &&& middle) ^^^ ((~~~left) &&& right)

/-- The majority function over three words. -/
def majority (left middle right : UInt32) : UInt32 :=
  (left &&& middle) ^^^ (left &&& right) ^^^ (middle &&& right)

def bigSigmaZero (value : UInt32) : UInt32 :=
  rotr value 2 ^^^ rotr value 13 ^^^ rotr value 22

def bigSigmaOne (value : UInt32) : UInt32 :=
  rotr value 6 ^^^ rotr value 11 ^^^ rotr value 25

def smallSigmaZero (value : UInt32) : UInt32 :=
  rotr value 7 ^^^ rotr value 18 ^^^ (value >>> 3)

def smallSigmaOne (value : UInt32) : UInt32 :=
  rotr value 17 ^^^ rotr value 19 ^^^ (value >>> 10)

/-! ## The block schedule -/

/-- The eight working words of the compression function. -/
structure Working where
  a : UInt32
  b : UInt32
  c : UInt32
  d : UInt32
  e : UInt32
  f : UInt32
  g : UInt32
  h : UInt32

/-- The starting working words. -/
def initialWorking : Working :=
  { a := initialWords.getD 0 0, b := initialWords.getD 1 0
  , c := initialWords.getD 2 0, d := initialWords.getD 3 0
  , e := initialWords.getD 4 0, f := initialWords.getD 5 0
  , g := initialWords.getD 6 0, h := initialWords.getD 7 0 }

/-- Extend the schedule by one word. -/
def scheduleStep (words : Array UInt32) (index : Nat) : Array UInt32 :=
  let zero := smallSigmaZero (words.getD (index - 15) 0)
  let one := smallSigmaOne (words.getD (index - 2) 0)
  words.push (words.getD (index - 16) 0 + zero + words.getD (index - 7) 0 + one)

/-- The sixty-four-word schedule of the block starting at `offset`: sixteen
    big-endian words read out of the bytes, then forty-eight derived. -/
def blockSchedule (bytes : Array UInt8) (offset : Nat) : Array UInt32 :=
  let read := (List.range 16).foldl
    (fun words index =>
      let start := offset + index * 4
      words.push
        (((bytes.getD start 0).toUInt32 <<< 24) |||
          ((bytes.getD (start + 1) 0).toUInt32 <<< 16) |||
          ((bytes.getD (start + 2) 0).toUInt32 <<< 8) |||
          (bytes.getD (start + 3) 0).toUInt32))
    (#[] : Array UInt32)
  (List.range' 16 48).foldl scheduleStep read

/-- One compression round. -/
def round (words : Array UInt32) (state : Working) (index : Nat) : Working :=
  let first := state.h + bigSigmaOne state.e + choose state.e state.f state.g
    + roundConstants.getD index 0 + words.getD index 0
  let second := bigSigmaZero state.a + majority state.a state.b state.c
  { a := first + second, b := state.a, c := state.b, d := state.c
  , e := state.d + first, f := state.e, g := state.f, h := state.g }

/-- Compress one block into the running state. -/
def compress (state : Working) (words : Array UInt32) : Working :=
  let worked := (List.range 64).foldl (round words) state
  { a := state.a + worked.a, b := state.b + worked.b
  , c := state.c + worked.c, d := state.d + worked.d
  , e := state.e + worked.e, f := state.f + worked.f
  , g := state.g + worked.g, h := state.h + worked.h }

/-! ## Padding and the digest -/

/-- A count as eight big-endian bytes. -/
def bigEndianEight (value : Nat) : List UInt8 :=
  (List.range 8).map fun index => UInt8.ofNat ((value >>> ((7 - index) * 8)) % 256)

/-- The standard padding: a set high bit, zeros to fifty-six bytes past a
    block boundary, then the message length in bits. -/
def pad (bytes : Array UInt8) : Array UInt8 :=
  let bits := bytes.size * 8
  let marked := bytes.push 0x80
  let zeros := (56 + 64 - marked.size % 64) % 64
  let filled := (List.replicate zeros (0 : UInt8)).foldl Array.push marked
  (bigEndianEight bits).foldl Array.push filled

/-- One hexadecimal digit, lowercase. -/
def hexDigit (value : Nat) : Char :=
  if value < 10 then Char.ofNat ('0'.toNat + value)
  else Char.ofNat ('a'.toNat + value - 10)

/-- One word as eight lowercase hexadecimal digits. -/
def hexWord (word : UInt32) : String :=
  String.ofList ((List.range 8).map fun index =>
    hexDigit ((word.toNat >>> ((7 - index) * 4)) % 16))

/-- The digest of a byte array, lowercase hex. -/
def digestOfBytes (bytes : Array UInt8) : String :=
  let padded := pad bytes
  let state := (List.range (padded.size / 64)).foldl
    (fun state index => compress state (blockSchedule padded (index * 64)))
    initialWorking
  hexWord state.a ++ hexWord state.b ++ hexWord state.c ++ hexWord state.d ++
    hexWord state.e ++ hexWord state.f ++ hexWord state.g ++ hexWord state.h

/-- The digest of a string's UTF-8 bytes, lowercase hex. -/
def digestOf (text : String) : String := digestOfBytes text.toUTF8.data

end Unity.Sha

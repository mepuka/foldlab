/-!
# Executable layer: lane-level Keccak and byte-level SHA3-512

The executable carrier per MODEL-INVARIANTS.md: `Vector (BitVec 64) 25`. The permutation is the
probe implementation already kernel-KAT-checked on both hosts (`Sha3.Probe.katFull`); this module
adopts it under `Sha3.Impl` and adds the byte-level sponge for SHA3-512 (rate 72 bytes).

Byte-level padding uses the standard byte-aligned form of `01 ‖ pad10*1` (first pad byte 0x06,
last 0x80, single-byte case 0x86 — FIPS 202 B.2, Table 6 shapes). Its agreement with the
bit-level spec padding is bridge obligation B2, not assumed here; this layer's own evidence is
the pinned CAVP vectors checked below.

Lane packing follows §3.1.2 + B.1: byte `k` of the rate block lands in lane `k / 8` at bit
position `8 · (k mod 8)` (LSB-first within bytes, little-endian bytes within lanes).
-/

namespace Sha3.Impl

abbrev W := BitVec 64
abbrev St := Vector W 25

/-- §3.2.5: the 24 round-constant lanes (RC for ir = 0, …, 23). Equality with the
LFSR-generated `Spec.rcBit` is theorem T1, not an assumption of this table. -/
def rcv : Vector W 24 := #v[
  0x0000000000000001, 0x0000000000008082, 0x800000000000808A, 0x8000000080008000,
  0x000000000000808B, 0x0000000080000001, 0x8000000080008081, 0x8000000000008009,
  0x000000000000008A, 0x0000000000000088, 0x0000000080008009, 0x000000008000000A,
  0x000000008000808B, 0x800000000000008B, 0x8000000000008089, 0x8000000000008003,
  0x8000000000008002, 0x8000000000000080, 0x000000000000800A, 0x800000008000000A,
  0x8000000080008081, 0x8000000000008080, 0x0000000080000001, 0x8000000080008008]

/-- §3.2.2 Table 2 offsets mod 64, laid out at index `x + 5y`. Verified against the
standard's table image 2026-08-24 (all 25 entries); equality with the walk-generated
`Spec.rhoOffset` is theorem T2. -/
def rhov : Vector Nat 25 := #v[
   0,  1, 62, 28, 27, 36, 44,  6, 55, 20,  3, 10, 43,
  25, 39, 41, 45, 15, 21,  8, 18,  2, 61, 56, 14]

@[inline] def at5 (a : St) (x y : Nat) : W := a[(x % 5) + 5 * (y % 5)]!

def theta (a : St) : St :=
  let col : Nat → W := fun x => at5 a x 0 ^^^ at5 a x 1 ^^^ at5 a x 2 ^^^ at5 a x 3 ^^^ at5 a x 4
  let d : Nat → W := fun x => col ((x + 4) % 5) ^^^ (col ((x + 1) % 5)).rotateLeft 1
  Vector.ofFn (fun i : Fin 25 => a[i] ^^^ d (i.val % 5))

def rhoPi (a : St) : St :=
  Vector.ofFn (fun i : Fin 25 =>
    let X := i.val % 5
    let Y := i.val / 5
    let y := X
    let x := (3 * (Y + 5 - (3 * X) % 5)) % 5
    (at5 a x y).rotateLeft (rhov[x + 5 * y]!))

def chi (a : St) : St :=
  Vector.ofFn (fun i : Fin 25 =>
    let x := i.val % 5
    let y := i.val / 5
    at5 a x y ^^^ ((~~~at5 a (x + 1) y) &&& at5 a (x + 2) y))

def rnd (a : St) (i : Nat) : St :=
  let b := chi (rhoPi (theta a))
  b.set 0 (b[0] ^^^ rcv[i]!)

/-- Keccak-p[1600, 24] on lanes — the kernel-KAT-checked permutation. -/
def keccakF (a : St) : St := (List.range 24).foldl rnd a

/-- SHA3-512 rate: r = 1600 − 1024 = 576 bits = 72 bytes. -/
def rateBytes : Nat := 72

/-- Lane `i` of a ≤72-byte block: bytes `8i, …, 8i+7`, little-endian (absent bytes are 0). -/
def laneOfBytes (bs : List UInt8) (i : Nat) : W :=
  (List.range 8).foldl
    (fun acc j => acc ||| (BitVec.ofNat 64 (bs.getD (8 * i + j) 0).toNat <<< (8 * j))) 0

/-- §4 Algorithm 8, Step 6: `S := f(S ⊕ (Pᵢ ‖ 0^c))` at the lane level. -/
def absorbBlock (s : St) (block : List UInt8) : St :=
  keccakF (Vector.ofFn fun i : Fin 25 => s[i] ^^^ laneOfBytes block i.val)

/-- Byte-aligned `01 ‖ pad10*1` for rate 72: append 0x06, zero-fill, set the final byte's
top bit (0x80); a single free byte gets 0x86. -/
def padBytes (msg : List UInt8) : List UInt8 :=
  let padLen := rateBytes - msg.length % rateBytes
  if padLen = 1 then msg ++ [0x86]
  else msg ++ (0x06 :: List.replicate (padLen - 2) 0) ++ [0x80]

/-- Bytes of one lane, little-endian. -/
def bytesOfLane (w : W) : List UInt8 :=
  (List.range 8).map fun j => UInt8.ofNat ((w >>> (8 * j)).toNat &&& 0xFF)

/-- SHA3-512 on byte messages: pad, absorb all rate blocks, squeeze 64 bytes
(d = 512 ≤ r, so a single squeeze — lanes 0–7). -/
def sha3_512 (msg : List UInt8) : List UInt8 :=
  let P := padBytes msg
  let n := P.length / rateBytes
  let s := (List.range n).foldl
    (fun s i => absorbBlock s ((P.drop (i * rateBytes)).take rateBytes))
    (Vector.replicate 25 0)
  ((List.range 8).map fun i => bytesOfLane s[i]!).flatten

/-- T10's subject (Pass B approved addition): the pre-FIPS Keccak padding — bare `pad10*1`
with no `01` domain-separation suffix, so the first pad byte is 0x01 in place of 0x06
(single-byte case 0x81). Everything else identical to `sha3_512`. -/
def keccak512_prefips (msg : List UInt8) : List UInt8 :=
  let padLen := rateBytes - msg.length % rateBytes
  let P := if padLen = 1 then msg ++ [0x81]
           else msg ++ (0x01 :: List.replicate (padLen - 2) 0) ++ [0x80]
  let n := P.length / rateBytes
  let s := (List.range n).foldl
    (fun s i => absorbBlock s ((P.drop (i * rateBytes)).take rateBytes))
    (Vector.replicate 25 0)
  ((List.range 8).map fun i => bytesOfLane s[i]!).flatten

/-- Lowercase hex rendering (sanity-check plumbing only). -/
def toHex (bs : List UInt8) : String :=
  String.ofList (bs.flatMap fun b =>
    ["0123456789abcdef".toList.getD (b.toNat / 16) '?',
     "0123456789abcdef".toList.getD (b.toNat % 16) '?'])

/-!
Elaboration-time sanity against the pinned CAVP vectors
(`SHA3_512ShortMsg.rsp`, file sha256 11d0676f4c6f10e30c5025204f4e15cd1ef6b1e34f6660d586d8ae9dfab4d721,
vendored in the kim-em clone; Len = 0, 24, 568, 576 — the last two straddle the rate boundary).
These `#guard`s run compiled evaluation: they are conformance sanity, not theorems; the kernel
KAT theorems are frozen in the Pass B snapshot.
-/

#guard toHex (sha3_512 []) ==
  "a69f73cca23a9ac5c8b567dc185a756e97c982164fe25859e0d1dcc1475c80a615b2123af1f5f94c11e3e9402c3ac558f500199d95b6d3e301758586281dcd26"

#guard toHex (sha3_512 [0x37, 0xd5, 0x18]) ==
  "4aa96b1547e6402c0eee781acaa660797efe26ec00b4f2e0aec4a6d10688dd64cbd7f12b3b6c7f802e2096c041208b9289aec380d1a748fdfcd4128553d781e3"

/- Rate-boundary vectors (edge case E2: Len = 568 and 576 bits — padding straddles the
72-byte block boundary; 576 forces a second, padding-only block). -/

#guard toHex (sha3_512 [0xb0, 0xde, 0x04, 0x30, 0xc2, 0x00, 0xd7, 0x4b, 0xf4, 0x1e,
    0xa0, 0xc9, 0x2f, 0x8f, 0x28, 0xe1, 0x1b, 0x68, 0x00, 0x6a, 0x88, 0x4e, 0x0d, 0x4b,
    0x0d, 0x88, 0x45, 0x33, 0xee, 0x58, 0xb3, 0x8a, 0x43, 0x8c, 0xc1, 0xa7, 0x57, 0x50,
    0xb6, 0x43, 0x4f, 0x46, 0x7e, 0x2d, 0x0c, 0xd9, 0xaa, 0x40, 0x52, 0xce, 0xb7, 0x93,
    0x29, 0x1b, 0x93, 0xef, 0x83, 0xfd, 0x5d, 0x86, 0x20, 0x45, 0x6c, 0xe1, 0xaf, 0xf2,
    0x94, 0x1b, 0x36, 0x05, 0xa4]) ==
  "9e9e469ca9226cd012f5c9cc39c96adc22f420030fcee305a0ed27974e3c802701603dac873ae4476e9c3d57e55524483fc01adaef87daa9e304078c59802757"

#guard toHex (sha3_512 [0x0c, 0xe9, 0xf8, 0xc3, 0xa9, 0x90, 0xc2, 0x68, 0xf3, 0x4e,
    0xfd, 0x9b, 0xef, 0xdb, 0x0f, 0x7c, 0x4e, 0xf8, 0x46, 0x6c, 0xfd, 0xb0, 0x11, 0x71,
    0xf8, 0xde, 0x70, 0xdc, 0x5f, 0xef, 0xa9, 0x2a, 0xcb, 0xe9, 0x3d, 0x29, 0xe2, 0xac,
    0x1a, 0x5c, 0x29, 0x79, 0x12, 0x9f, 0x1a, 0xb0, 0x8c, 0x0e, 0x77, 0xde, 0x79, 0x24,
    0xdd, 0xf6, 0x8a, 0x20, 0x9c, 0xdf, 0xa0, 0xad, 0xc6, 0x2f, 0x85, 0xc1, 0x86, 0x37,
    0xd9, 0xc6, 0xb3, 0x3f, 0x4f, 0xf8]) ==
  "b018a20fcf831dde290e4fb18c56342efe138472cbe142da6b77eea4fce52588c04c808eb32912faa345245a850346faec46c3a16d39bd2e1ddb1816bc57d2da"

end Sha3.Impl

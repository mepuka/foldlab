set_option maxRecDepth 8000000
set_option maxHeartbeats 8000000

/-!
# Keccak-f[1600] feasibility probe (pre-Pass-A material)

Purely functional lane-level Keccak-f[1600] with a kernel-checked full-state
known-answer theorem. This is the tactics-audit probe of 2026-08-24, adopted as
the project's first standing gate: it demonstrates the pure-kernel KAT route on
the artifact's own toolchain. It is NOT the L-SPEC — the bit-addressed FIPS 202
spec arrives via formalization-strategy Pass A and will supersede this module's
definitions. Expected axiom profile of `katFull`: `[propext, Quot.sound]`.
KAT expectation: Keccak-f[1600] of the all-zero state (XKCP known answer).
-/

namespace Sha3.Probe

abbrev W := BitVec 64
abbrev St := Vector W 25

def rcv : Vector W 24 := #v[
  0x0000000000000001, 0x0000000000008082, 0x800000000000808A, 0x8000000080008000,
  0x000000000000808B, 0x0000000080000001, 0x8000000080008081, 0x8000000000008009,
  0x000000000000008A, 0x0000000000000088, 0x0000000080008009, 0x000000008000000A,
  0x000000008000808B, 0x800000000000008B, 0x8000000000008089, 0x8000000000008003,
  0x8000000000008002, 0x8000000000000080, 0x000000000000800A, 0x800000008000000A,
  0x8000000080008081, 0x8000000000008080, 0x0000000080000001, 0x8000000080008008]

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
    at5 a x y ^^^ ((~~~ at5 a (x+1) y) &&& at5 a (x+2) y))

def rnd (a : St) (i : Nat) : St :=
  let b := chi (rhoPi (theta a))
  b.set 0 (b[0] ^^^ rcv[i]!)

def keccakF (a : St) : St := (List.range 24).foldl rnd a

def zero : St := Vector.replicate 25 0

/-- Full-state kernel-checked KAT: all 25 lanes in ONE `rfl`. -/
theorem katFull : keccakF zero = #v[
  0xf1258f7940e1dde7, 0x84d5ccf933c0478a, 0xd598261ea65aa9ee, 0xbd1547306f80494d,
  0x8b284e056253d057, 0xff97a42d7f8e6fd4, 0x90fee5a0a44647c4, 0x8c5bda0cd6192e76,
  0xad30a6f71b19059c, 0x30935ab7d08ffc64, 0xeb5aa93f2317d635, 0xa9a6e6260d712103,
  0x81a57c16dbcf555f, 0x43b831cd0347c826, 0x01f22f1a11a5569f, 0x05e5635a21d9ae61,
  0x64befef28cc970f2, 0x613670957bc46611, 0xb87c5a554fd00ecb, 0x8c3ee88a1ccf32c8,
  0x940c7922ae3a2614, 0x1841f924a2c509e4, 0x16f53526e70465c2, 0x75f644e97f30a13b,
  0xeaf1ff7b5ceca249] := by rfl

/-- Statement pin (dregg-style): the literal proposition, kernel-checked against
`katFull`, so any drift in the theorem's statement is a build error here. -/
example : keccakF zero = #v[
  0xf1258f7940e1dde7, 0x84d5ccf933c0478a, 0xd598261ea65aa9ee, 0xbd1547306f80494d,
  0x8b284e056253d057, 0xff97a42d7f8e6fd4, 0x90fee5a0a44647c4, 0x8c5bda0cd6192e76,
  0xad30a6f71b19059c, 0x30935ab7d08ffc64, 0xeb5aa93f2317d635, 0xa9a6e6260d712103,
  0x81a57c16dbcf555f, 0x43b831cd0347c826, 0x01f22f1a11a5569f, 0x05e5635a21d9ae61,
  0x64befef28cc970f2, 0x613670957bc46611, 0xb87c5a554fd00ecb, 0x8c3ee88a1ccf32c8,
  0x940c7922ae3a2614, 0x1841f924a2c509e4, 0x16f53526e70465c2, 0x75f644e97f30a13b,
  0xeaf1ff7b5ceca249] := katFull

#print axioms katFull

end Sha3.Probe

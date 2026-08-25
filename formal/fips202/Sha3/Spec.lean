/-!
# FIPS 202 specification layer (bit-addressed)

Transcribed from NIST FIPS 202 (August 2015), pinned PDF
`.reference/papers/nist-2015-fips202-sha3-standard.pdf`
(sha256 1592607831ff0908cc590632ce371c6c95e94025bb1a0c8ae90a4d0ec1ed025e), sections cited per
definition. Carrier and layering per MODEL-INVARIANTS.md: this layer is the meaning, never the
executor — evaluating it is deliberately out of scope (pointwise closures share nothing, so
direct evaluation is infeasible; execution lives in `Sha3.Impl`, connected by the bridge
obligations in the Pass B snapshot).

Transcription-fidelity trust step (contract C2): fidelity of these definitions to the standard's
prose is human-checked, evidenced downstream by Impl KATs through the bridge.
-/

namespace Sha3.Spec

/-- §3.1: the state array for b = 1600, w = 64, addressed `A[x, y, z]`. -/
def StateArray := Fin 5 → Fin 5 → Fin 64 → Bool

/-- Mod-64 backwards shift of a z-index: `(z − off) mod w`. -/
def zsub (z : Fin 64) (off : Nat) : Fin 64 :=
  ⟨(z.val + 64 - off % 64) % 64, Nat.mod_lt _ (by decide)⟩

/-- §3.2.1 Algorithm 1, Step 1: column parity `C[x, z]`. -/
def col (A : StateArray) (x : Fin 5) (z : Fin 64) : Bool :=
  A x 0 z ^^ A x 1 z ^^ A x 2 z ^^ A x 3 z ^^ A x 4 z

/-- §3.2.1 Algorithm 1: θ. `D[x,z] = C[(x−1) mod 5, z] ⊕ C[(x+1) mod 5, (z−1) mod w]`;
`A′[x,y,z] = A[x,y,z] ⊕ D[x,z]`. (`x + 4` is `(x − 1) mod 5` in `Fin 5`.) -/
def theta (A : StateArray) : StateArray := fun x y z =>
  A x y z ^^ (col A (x + 4) z ^^ col A (x + 1) (zsub z 1))

/-- §3.2.2 Algorithm 2, Steps 2–3b: the ρ walk. Position `t` starting at `(1, 0)`,
stepping `(x, y) := (y, (2x + 3y) mod 5)`. -/
def rhoWalk : Nat → Fin 5 × Fin 5
  | 0 => (1, 0)
  | t + 1 => let (x, y) := rhoWalk t; (y, 2 * x + 3 * y)

/-- §3.2.2 Algorithm 2, Step 3a: the offset of lane `(x, y)` is `(t+1)(t+2)/2` for the unique
`t < 24` with `rhoWalk t = (x, y)`, and `0` for lane `(0, 0)` (Step 1). -/
def rhoOffset (x y : Fin 5) : Nat :=
  (List.range 24).foldl (fun acc t => if rhoWalk t = (x, y) then (t + 1) * (t + 2) / 2 else acc) 0

/-- §3.2.2 Algorithm 2: ρ. `A′[x, y, z] = A[x, y, (z − offset(x,y)) mod w]`. -/
def rho (A : StateArray) : StateArray := fun x y z =>
  A x y (zsub z (rhoOffset x y))

/-- §3.2.3 Algorithm 3: π. `A′[x, y, z] = A[(x + 3y) mod 5, x, z]`. -/
def pi (A : StateArray) : StateArray := fun x y z =>
  A (x + 3 * y) x z

/-- §3.2.4 Algorithm 4: χ. `A′[x,y,z] = A[x,y,z] ⊕ ((A[(x+1) mod 5, y, z] ⊕ 1) ⋅ A[(x+2) mod 5, y, z])`. -/
def chi (A : StateArray) : StateArray := fun x y z =>
  A x y z ^^ ((!A (x + 1) y z) && A (x + 2) y z)

/-- §3.2.5 Algorithm 5, Step 3: one LFSR update of the 8-bit register `R`
(prepend 0; taps 0, 4, 5, 6 each ⊕ `R[8]`; truncate to 8). -/
def rcUpdate (R : List Bool) : List Bool :=
  let R9 := false :: R
  let r8 := R9.getD 8 false
  let R9 := R9.set 0 (R9.getD 0 false ^^ r8)
  let R9 := R9.set 4 (R9.getD 4 false ^^ r8)
  let R9 := R9.set 5 (R9.getD 5 false ^^ r8)
  let R9 := R9.set 6 (R9.getD 6 false ^^ r8)
  R9.take 8

/-- §3.2.5 Algorithm 5: `rc(t)` — iterate the LFSR `t mod 255` times from `R = 10000000`
and return `R[0]`. (For `t mod 255 = 0` the loop is empty and `R[0] = 1`, Step 1.) -/
def rc (t : Nat) : Bool :=
  ((List.range (t % 255)).foldl (fun R _ => rcUpdate R) (true :: List.replicate 7 false)).getD 0 false

/-- §3.2.5 Algorithm 6, Steps 2–3: the round constant lane. `RC[2^j − 1] = rc(j + 7·ir)`
for `0 ≤ j ≤ l = 6`; all other bits zero. -/
def rcBit (ir : Nat) (z : Fin 64) : Bool :=
  (List.range 7).foldl (fun acc j => if z.val = 2 ^ j - 1 then rc (j + 7 * ir) else acc) false

/-- §3.2.5 Algorithm 6: ι. Lane `(0, 0)` is XORed with `RC`; all other lanes unchanged. -/
def iota (ir : Nat) (A : StateArray) : StateArray := fun x y z =>
  if x = 0 ∧ y = 0 then A x y z ^^ rcBit ir z else A x y z

/-- §3.3: `Rnd(A, ir) = ι(χ(π(ρ(θ(A)))), ir)`. -/
def Rnd (A : StateArray) (ir : Nat) : StateArray :=
  iota ir (chi (pi (rho (theta A))))

/-- §3.3 Algorithm 7 at b = 1600, nr = 24: rounds `ir = 0, …, 23` (since `12 + 2l − nr = 0`). -/
def keccakP (A : StateArray) : StateArray :=
  (List.range 24).foldl Rnd A

/-- §3.1.2: `A[x, y, z] = S[w(5y + x) + z]` (out-of-range bits of `S` read as 0). -/
def stateOfBits (S : List Bool) : StateArray := fun x y z =>
  S.getD (64 * (5 * y.val + x.val) + z.val) false

/-- §3.1.3: `S = Plane(0) ‖ … ‖ Plane(4)`, i.e. bit `i` of `S` is
`A[(i/64) mod 5, (i/64)/5, i mod 64]`. -/
def bitsOfState (A : StateArray) : List Bool :=
  (List.range 1600).map fun i =>
    A ⟨i / 64 % 5, Nat.mod_lt _ (by decide)⟩
      ⟨i / 64 / 5 % 5, Nat.mod_lt _ (by decide)⟩
      ⟨i % 64, Nat.mod_lt _ (by decide)⟩

/-- §5.1 Algorithm 9: `pad10*1(x, m) = 1 ‖ 0^j ‖ 1` with `j = (−m − 2) mod x`. -/
def pad101 (x m : Nat) : List Bool :=
  let j := (x - (m + 2) % x) % x
  true :: (List.replicate j false ++ [true])

/-- Pointwise XOR of bit strings (used for `S ⊕ (Pᵢ ‖ 0^c)`, §4 Algorithm 8 Step 6). -/
def listXor (a b : List Bool) : List Bool := a.zipWith (· ^^ ·) b

/-- §4 Algorithm 8: `SPONGE[KECCAK-p[1600, 24], pad10*1, r](N, d)`.
Absorb the padded input in `r`-bit blocks (each extended by `0^c`), then squeeze
`Trunc_r` blocks until `d` bits are available. -/
def sponge (r : Nat) (N : List Bool) (d : Nat) : List Bool :=
  let P := N ++ pad101 r N.length
  let n := P.length / r
  let c := 1600 - r
  let permute : List Bool → List Bool := fun S => bitsOfState (keccakP (stateOfBits S))
  let Sabs := (List.range n).foldl
    (fun S i => permute (listXor S ((P.drop (i * r)).take r ++ List.replicate c false)))
    (List.replicate 1600 false)
  let nOut := (d + r - 1) / r
  (((List.range nOut).foldl
      (fun (acc : List Bool × List Bool) _ => (acc.1 ++ acc.2.take r, permute acc.2))
      ([], Sabs)).1).take d

/-- §5.2: `KECCAK[c](N, d) = SPONGE[KECCAK-p[1600, 24], pad10*1, 1600 − c](N, d)`. -/
def keccakC (c : Nat) (N : List Bool) (d : Nat) : List Bool :=
  sponge (1600 - c) N d

/-- §6.1: the four SHA-3 hash functions, each appending the two-bit suffix `01`
(domain separation) — `SHA3-512(M) = KECCAK[1024](M ‖ 01, 512)`, etc. -/
def SHA3_224 (M : List Bool) : List Bool := keccakC 448 (M ++ [false, true]) 224
def SHA3_256 (M : List Bool) : List Bool := keccakC 512 (M ++ [false, true]) 256
def SHA3_384 (M : List Bool) : List Bool := keccakC 768 (M ++ [false, true]) 384
def SHA3_512 (M : List Bool) : List Bool := keccakC 1024 (M ++ [false, true]) 512

/-- B.1 Algorithm 10, Steps 2b–3: bits of one byte, LSB-first (`T[8i + j] = b_ij` with
`h_i = Σ_j b_ij · 2^j`). -/
def bitsOfByte (b : UInt8) : List Bool :=
  (List.range 8).map fun j => (b.toNat >>> j) &&& 1 == 1

/-- B.1: byte string → bit string (LSB-first within each byte). -/
def bitsOfBytes (bs : List UInt8) : List Bool :=
  bs.flatMap bitsOfByte

/-- B.1 inverse for one byte: `h = Σ_j b_j · 2^j`. -/
def byteOfBits (bits : List Bool) : UInt8 :=
  UInt8.ofNat ((List.range 8).foldl (fun acc j => acc + (if bits.getD j false then 2 ^ j else 0)) 0)

/-- B.1 inverse: bit string → byte string (whole bytes only). -/
def bytesOfBits (bits : List Bool) : List UInt8 :=
  (List.range (bits.length / 8)).map fun i => byteOfBits ((bits.drop (8 * i)).take 8)

/-- The byte-level observable of the contract: SHA3-512 on byte messages. -/
def sha3_512_bytes (M : List UInt8) : List UInt8 :=
  bytesOfBits (SHA3_512 (bitsOfBytes M))

end Sha3.Spec

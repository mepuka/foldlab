/-
`H` for the shell: the estate's own kernel-KAT'd SHA3-512, wrapped as an `E2.Address`.

STORE-SHELL §1: `H := fun b => (⟨Sha3.Impl.sha3_512 b⟩ : Address)`. This module is the
ONLY place the digest is chosen; every other shell module takes `H` as it finds it here.
The 64-byte digest matches the carrier's declared placeholder width (`Shell.digestBytes`).

KAT posture. `Sha3.Kats` proves `sha3_512`'s CAVP digests in the kernel
(`kat_sha3_512_empty`, `kat_sha3_512_37d518`). `H` calls that exact function, so the
known answers transfer by construction — nothing is re-minted here. What the shell adds
is the hex spelling of an address, and that is what the `#guard`s below exercise: they
are compiled-evaluation conformance sanity, not theorems (the estate's `#guard` idiom,
cf. `formal/fips202/Sha3/Impl.lean`).
-/
import E2
import Sha3
import Shell.Hex

namespace Shell

open E2 (Address Bytes)

/-- The digest function (STORE-SHELL §1). -/
def H (b : Bytes) : Address := ⟨Sha3.Impl.sha3_512 b⟩

/-- `H` is the KAT'd function, wrapped — stated so the reuse is visible, not asserted. -/
theorem H_bytes (b : Bytes) : (H b).bytes = Sha3.Impl.sha3_512 b := rfl

/-! Smoke fixtures on the two kernel-proved KAT messages. The first two carry no digest
    literal at all — they check the shell's own new surface, the hex round-trip. The
    third pins the rendering against the hex string already pinned in
    `formal/fips202/Sha3/Impl.lean` (same CAVP response file, sha256
    11d0676f4c6f10e30c5025204f4e15cd1ef6b1e34f6660d586d8ae9dfab4d721). -/

#guard addrOfHex (hexOfAddr (H [])) == some (H [])
#guard addrOfHex (hexOfAddr (H [0x37, 0xd5, 0x18])) == some (H [0x37, 0xd5, 0x18])
#guard (hexOfAddr (H [])).length == digestHexChars
#guard hexOfAddr (H []) ==
  "a69f73cca23a9ac5c8b567dc185a756e97c982164fe25859e0d1dcc1475c80a615b2123af1f5f94c11e3e9402c3ac558f500199d95b6d3e301758586281dcd26"
#guard hexOfAddr (H [0x37, 0xd5, 0x18]) ==
  "4aa96b1547e6402c0eee781acaa660797efe26ec00b4f2e0aec4a6d10688dd64cbd7f12b3b6c7f802e2096c041208b9289aec380d1a748fdfcd4128553d781e3"

end Shell

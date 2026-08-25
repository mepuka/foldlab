/-
Pin seat — `version_byte_separates` (ruling W3-22, pin 3). Every pre-image of this scheme
declares its scheme version at byte 0, and a byte string whose first byte differs is no
pre-image of this scheme at all.

WHY THIS IS A THEOREM AND NOT A REMARK (U-16). Unison's hashing doctrine says that if the
hash function changes at all, the version must bump so that *every* value's hash changes,
else base32 collisions across versions in the `hash` table. S3 grades that a **C4
soundness argument, stated in prose, never discharged** — the reasoning is not tested,
and Unison has no published stability guarantee for it. E2 carries the analogous argument
(L6, STORE-MODEL §1's `versionByte`, §2's pre-image line) and, until now, carried it the
same way Unison did: asserted. `sha3_ne_prefips_spec` is the precedent for discharging it
instead — the estate has already proved once, in `formal/fips202`, that a domain
separator does the job it is put there to do. This module is that theorem for the
pre-image version byte, in the same style: cheap, and owed (S5 §8.7 item 3; the M1–M19
ledger has no row for it).

WHAT IS AND IS NOT CLAIMED.

- CLAIMED: byte 0 of every pre-image is `versionByte`, and a byte string whose `head?`
  differs is not in the image of `preimageS` or `preimageE`. This is a statement about
  the SCHEME — the pre-image constructors — and holds for every `H`.
- NOT CLAIMED: anything about ADDRESSES. Lifting separation from pre-images to digests
  needs collision resistance, which `formal/fips202` explicitly does not claim (the
  digest is not injective — "false by counting"). The version byte lives in the
  pre-image, not in the address (anatomy §8.3), so this theorem is exactly as strong as
  the layer it is stated at, and no stronger.
- NOT CLAIMED: that a future scheme WILL bump the byte. That is a discipline, not a
  theorem. What is proved is that bumping it works — `version_byte_separates_bump`.
-/
import E2.Model

namespace E2

/-- The image of this scheme's pre-image constructors: a byte string is a pre-image
    exactly when some schema or some (schema-address, value) pair produces it. Two kinds
    and no third — `kind_separation` already proves the two are disjoint. -/
def IsPreimage (b : Bytes) : Prop :=
  (∃ s : SchemaCore, b = preimageS s) ∨ (∃ (a : Address) (v : Value), b = preimageE a v)

/-! ## Byte 0 of each kind. Both are `rfl`: the version byte is the outermost cons of the
    pre-image, which is the whole content of the "version lives in the pre-image, not in
    the address" ruling made mechanical. -/

theorem preimageS_head_versionByte (s : SchemaCore) :
    (preimageS s).head? = some versionByte := rfl

theorem preimageE_head_versionByte (a : Address) (v : Value) :
    (preimageE a v).head? = some versionByte := rfl

/-- Every pre-image, either kind, declares the scheme version at byte 0. -/
theorem isPreimage_head_versionByte {b : Bytes} (h : IsPreimage b) :
    b.head? = some versionByte := by
  rcases h with ⟨s, rfl⟩ | ⟨a, v, rfl⟩
  · exact preimageS_head_versionByte s
  · exact preimageE_head_versionByte a v

/-- **`version_byte_separates`** — the separation corollary, and the pin. A byte string
    whose first byte is not `versionByte` is no pre-image of this scheme: not a schema
    pre-image, not an entity pre-image, for any carrier whatsoever.

    This is the shape `sha3_ne_prefips_spec` has for the SHA-3 domain separator, at the
    layer the estate can actually reach. -/
theorem version_byte_separates {b : Bytes} (h : b.head? ≠ some versionByte) :
    ¬ IsPreimage b :=
  fun hp => h (isPreimage_head_versionByte hp)

/-- The agility payoff, stated so the migration argument is discharged rather than
    asserted: a scheme that bumps the version byte moves EVERY one of its pre-images out
    of this scheme's image at once. This is the analogue of Unison's C4 — the claim that
    a version bump makes every value's hash change — and it is the pre-image half of it,
    which is the half that is provable without a hash hypothesis. -/
theorem version_byte_separates_bump {w : UInt8} (hw : w ≠ versionByte) (rest : Bytes) :
    ¬ IsPreimage (w :: rest) := by
  apply version_byte_separates
  simpa using hw

/-- The contrapositive, in the form a decoder uses: reading byte 0 and finding something
    other than `versionByte` is a conclusive rejection, not a heuristic one. `stripPre`
    and `refsOfPreimage` both open with exactly this test. -/
theorem not_preimage_of_head_ne {b : Bytes} {w : UInt8}
    (hhead : b.head? = some w) (hw : w ≠ versionByte) : ¬ IsPreimage b := by
  apply version_byte_separates
  rw [hhead]
  simpa using hw

end E2

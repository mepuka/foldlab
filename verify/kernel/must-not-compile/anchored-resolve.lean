/- Must-not-compile control: the intrinsic resolve has no anchor slot.
   A digest names one value forever, so there is nothing an anchor
   could change — spelling one is refused by the elaborator. The
   lawful twin lives in `anchored-resolve.witness.lean`. -/
import Kernel

open Kernel

def someTarget : Digest DeclKind.schema := ⟨9⟩
def somePartition : LanePartition := { lane := ⟨1⟩, shard := 0 }
def someAnchor : AnchorFact ⟨2⟩ somePartition :=
  { floor := ⟨4⟩, state := ⟨11⟩, head := ⟨6⟩ }

example : Act := Act.resolve DeclKind.schema someTarget someAnchor

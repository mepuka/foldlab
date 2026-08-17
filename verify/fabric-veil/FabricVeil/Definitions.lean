import Veil
import Lean

namespace FabricVeil

open Lean

/-- F5 is parameterized by one work digest; a runtime key supplies it. -/
abbrev Token := Nat

/-- The five actions in the lease-register transition system. -/
inductive ActionKind where
  | grant
  | renew
  | commit
  | expireSteal
  | observe
deriving DecidableEq, Repr, ToJson

end FabricVeil

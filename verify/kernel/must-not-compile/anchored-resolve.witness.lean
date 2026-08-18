/- Witness twin: the anchor-free resolve elaborates — the signature is
   the law showing. -/
import Kernel

open Kernel

def someTarget : Digest DeclKind.schema := ⟨9⟩

example : Act := Act.resolve DeclKind.schema someTarget

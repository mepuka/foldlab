/- Witness twin: the same comparison inside one register elaborates,
   so the control file fails for the sort discipline and not for rot. -/
import Kernel

open Kernel

def registerOne : Digest DeclKind.program := ⟨1⟩
def tokenAtOne : Token registerOne := ⟨7⟩
def laterTokenAtOne : Token registerOne := ⟨9⟩

example : Prop := tokenAtOne = laterTokenAtOne

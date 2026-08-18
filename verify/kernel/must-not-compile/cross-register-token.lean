/- Must-not-compile control: a fencing token means nothing outside its
   register. Comparing tokens across registers is refused by the
   elaborator — the comparison has no type. The lawful twin lives in
   `cross-register-token.witness.lean`. -/
import Kernel

open Kernel

def registerOne : Digest DeclKind.program := ⟨1⟩
def registerTwo : Digest DeclKind.program := ⟨2⟩
def tokenAtOne : Token registerOne := ⟨7⟩
def tokenAtTwo : Token registerTwo := ⟨7⟩

example : Prop := tokenAtOne = tokenAtTwo

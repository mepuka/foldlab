/- Must-not-compile control: digests are branded by declaration kind.
   A schema digest never compares with a program digest — the
   comparison is refused by the elaborator, which is the referent
   discipline the brands exist to carry. The lawful twin lives in
   `cross-kind-digest.witness.lean`. -/
import Kernel

open Kernel

def schemaDigest : Digest DeclKind.schema := ⟨9⟩
def programDigest : Digest DeclKind.program := ⟨9⟩

example : Prop := schemaDigest = programDigest

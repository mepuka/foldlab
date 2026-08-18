/- Witness twin: two digests of one kind compare lawfully. -/
import Kernel

open Kernel

def schemaDigest : Digest DeclKind.schema := ⟨9⟩
def otherSchemaDigest : Digest DeclKind.schema := ⟨10⟩

example : Prop := schemaDigest = otherSchemaDigest

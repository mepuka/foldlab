/- Control: a mini-AST row that lies about the sort system must be
   refused by the shape checker. The planted row below is the emitted
   `Digest` row with one field changed — its `kind` parameter marked an
   ordinary type argument instead of a brand. That is the exact lie a
   runtime code generator would act on by dropping the brand, and a
   checker that let it through would certify a corpus that had stopped
   describing the model. Its witness twin carries the same row with the
   brand intact and must elaborate, so the refusal is attributable to
   the planted change and not to file rot. -/
import Unity.Shapes

#kernelTypeRow "{\"record\":\"type\",\"name\":\"Digest\",\"form\":\"structure\",\"params\":[{\"name\":\"kind\",\"role\":\"type\"}],\"constructors\":[{\"name\":\"mk\",\"fields\":[{\"name\":\"id\",\"type\":\"Nat\"}]}]}"

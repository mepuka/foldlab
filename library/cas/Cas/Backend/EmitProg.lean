import Cas.Backend.Ts
import Cas.Grammar.Tree
import Cas.Codec.Hex

/-!
# Lowering grammar terms to straight-line Effect programs

A concrete `Tree` is a finite store program, so its `progK` unfolds to
a straight line: one `store.put` per node, children first, each later
node's references naming earlier answers. This is that unfolding as
generated TypeScript — the program computes its addresses LIVE through
the host's own digest, so agreement with the Lean-computed word is the
cross-host run gate (EFFECTS-BACKEND R5), never a replay of given
addresses.

Payloads mirror `Tree.node` exactly (same scalar encodings, same
framing); reference tags are the sorts' own wire tags. Nothing here
depends on an address function — the H-dependence lives entirely in
the yielded answers, which is the point.
-/

namespace Cas.Backend

open Cas.Grammar Cas.Backend.Ts Cas

/-- Hex spelling of payload bytes (the fixtures' own convention). -/
private def bytesHex (b : Bytes) : String := hexS b

private def putStmt (var : String) (tag : UInt8) (payload : Bytes)
    (refs : List (String × UInt8)) : Stmt :=
  .constYield var (.call (.ident "store.put") [.object [
    ("kind", .object [("version", .int 0), ("tag", .int tag.toNat)]),
    ("payload", .call (.ident "hex") [.str (bytesHex payload)]),
    ("refs", .arr (refs.map fun (name, expectedTag) =>
      .object [("id", .ident name), ("expectedTag", .int expectedTag.toNat)]))
  ]])

private def putNode (tag : UInt8) (payload : Bytes)
    (refs : List (String × UInt8)) : StateM (Array Stmt × Nat) String := do
  let (stmts, n) ← get
  let var := s!"a{n}"
  set (stmts.push (putStmt var tag payload refs), n + 1)
  return var

/-- The children-first walk: emits one put per node in `flatten` order
and answers the node's variable name. -/
partial def lowerTree : Tree t → StateM (Array Stmt × Nat) String
  | .value p => putNode Ty.value.wireTag p.val []
  | .chunk p => putNode Ty.chunk.wireTag p.val []
  | .leaf i l d => do
    let cd ← lowerTree d
    putNode Ty.tree.wireTag (nat32 i.toNat ++ nat32 l.toNat)
      [(cd, Ty.chunk.wireTag)]
  | .parent l r => do
    let la ← lowerTree l
    let ra ← lowerTree r
    putNode Ty.tree.wireTag [] [(la, Ty.tree.wireTag), (ra, Ty.tree.wireTag)]
  | .manifest re tot le root => do
    let ra ← lowerTree root
    putNode Ty.manifest.wireTag
      (nat32 re.toNat ++ nat64 tot.toNat ++ nat32 le.toNat)
      [(ra, Ty.tree.wireTag)]
  | .file name mt c => do
    let ca ← lowerTree c
    putNode Ty.file.wireTag (frame name.val ++ frame mt.val)
      [(ca, Ty.manifest.wireTag)]
  | .genesis => putNode Ty.entry.wireTag [] []
  | .entry note item prev => do
    let ia ← lowerTree item
    let pa ← lowerTree prev
    putNode Ty.entry.wireTag note.val
      [(ia, Ty.file.wireTag), (pa, Ty.entry.wireTag)]
  | .schema code _ _ =>
    putNode Ty.schema.wireTag (Grammar.utf8 code.payload) []

/-- One tree as one exported program declaration: every put in
`flatten` order, answering the word's addresses in order. -/
def treeProgram {t : Ty} (doc : List String) (name : String)
    (tr : Tree t) : ProgDecl :=
  let (root, (stmts, _)) := (lowerTree tr).run (#[], 0)
  let _ := root
  let vars := (List.range stmts.size).map fun i => Expr.ident s!"a{i}"
  { doc, name
    paramName := "store"
    paramType := "CasStoreShape"
    stmts := stmts.toList ++ [.ret (.arr vars)] }

end Cas.Backend

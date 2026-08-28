import Cas.Grammar.Sorts
import Cas.Grammar.Tree
import Cas.Grammar.Syntax

/-!
# The data grammar — layer 2 of the language

Sorted trees over the store's carriers. `Sorts` names the nonterminals
and their wire tags; `Tree` is the indexed family, its elaboration onto
`Node` through the real codec, the content address as a fold, and the
children-first store word with its admission law; `Syntax` is the
term-level surface.
-/

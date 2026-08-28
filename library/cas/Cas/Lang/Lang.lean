import Cas.Lang.Sig
import Cas.Lang.Prog
import Cas.Lang.Ops
import Cas.Lang.Interp
<<<<<<< HEAD
import Cas.Lang.Roots
=======
import Cas.Lang.Handler
import Cas.Lang.Tower
import Cas.Lang.Representation
>>>>>>> 3010bf7eeabd4e0882657a418b6025ee7ba83a25
import Cas.Lang.TreeProg
import Cas.Lang.Defun

/-!
# The program grammar — layer 3 of the language

Programs as operation trees over effect signatures. `Sig` makes a
language a value and composes languages by sum; `Prog` is the free
monad of continuations over a signature; `Ops` is the store language
(`put`/`load`/`fail`) and the LLM extension (`infer`); `Interp` is
one-step interpretation over the store word, calling the proved
admission judgment, with the L5–L7 agreement and preservation laws;
`Roots` is the publication extension (`RootSig`, the sum `StoreSig`,
and the rooted interpreter delegating Cas operations to `step`);
`TreeProg` is layer 2 derived inside layer 3 — the grammar term as a
store program, with `putTree_correct` (F1) proving the run computes
exactly the elaboration's address and store, deduplicating shared
subterms (F2).
-/

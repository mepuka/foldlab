(* Acceptance test for the annex toolchain.

   This is not a proof the estate cites; it exists to fail loudly when the
   switch is materialised wrong. It checks the three things a rebuild can
   silently get wrong: that Rocq compiles at all, and that both lane
   libraries load and expose the names the technique is read through —
   parameterized coinduction from paco, and the interaction-tree carrier. *)

From Paco Require Import paco.
From ITree Require Import ITree.

Check @paco1.
Check @upaco1.
Check @ITree.bind.
Check @ITree.iter.

Goal True. Proof. exact I. Qed.

/-
Whole-package gate leg for the `estore` executable root.

`Shell/Gate.lean` cannot see `Main`: that module imports `Shell`, so it is
downstream. Before these legs existed the roots were invisible to every G-S scan — a
clock, `IO.getEnv`, or a random source in `main` built all-gates-green (F-43(a),
refuter wave 2, source-confirmed). Each root defines its own top-level `main`, so no
single module can import all three; the gate runs once per root instead.
-/
import Shell.Gate
import Main

#shell_gates

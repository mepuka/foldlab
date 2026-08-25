/-
Whole-package gate leg for the `estore-vectors` executable root.

`Shell/Gate.lean` cannot see `VectorsMain`: that module imports `Shell`, so it is
downstream. Before these legs existed the roots were invisible to every G-S scan — a
clock, `IO.getEnv`, or a random source in `main` built all-gates-green (F-43(a),
refuter wave 2, source-confirmed). Each root defines its own top-level `main`, so no
single module can import all four; the gate runs once per root instead.

The emitter of the conformance bundle's golden vectors is the LAST root that should sit
outside this: a corpus is only worth what the tool that generated it is worth.
-/
import Shell.Gate
import VectorsMain

#shell_gates

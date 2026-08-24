# Refinement and conformance

Choose a relation from operational shape:

- equality for total pure functions with identical representation/observations;
- postcondition or weakest precondition for effectful stateful functions;
- forward/backward simulation or refinement for nondeterminism and compilers;
- trace inclusion/equivalence for protocols;
- elaborate/erase or encode/decode round trips for representations;
- oracle/differential conformance when an external implementation lacks a proof bridge.

Audit the relation with a deliberately wrong implementation/model. If it still satisfies the public
theorem, the relation or observables are too weak. Check direction: refinement may permit fewer
behaviors without establishing equivalence.

Generated code needs deterministic provenance, protected handwritten paths, source/generator pins,
independent parsing/typechecking, semantic or round-trip obligations, generated diff review, and
target-runtime tests. `extern`, FFI, and `implemented_by` create obligations; types do not prove
runtime behavior.

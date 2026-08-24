# Quantitative, probabilistic, and physical models

## Keep evidence layers distinct

| Topic           | Formal object                                   | Boundary that remains                             |
| --------------- | ----------------------------------------------- | ------------------------------------------------- |
| Cost/resources  | step-indexed cost semantics or resource algebra | calibration to wall time/hardware                 |
| Probability     | measure/distribution semantics                  | correctness of sampler and chosen distribution    |
| Numerical error | approximation relation/interval/error bound     | floating-point/platform model and input enclosure |
| Units           | dimensioned quantity and conversions            | sensor calibration and physical validity          |
| Hybrid dynamics | discrete transitions plus continuous evolution  | plant model, parameters, sensing/actuation        |
| Performance     | abstract operation count or WCET model          | workload/hardware/OS/environment provenance       |

Assign each quantity its real composition law: sequential work may add, peak memory may take `max`,
permissions may union, parallel latency may follow a critical path, and probabilities rarely compose
by simple addition.

Separate four claims: theorem about a mathematical model, refinement of an executable sampler or
numeric implementation, statistical/model-checking result, and benchmark/measurement. None can
silently stand in for another. Use assumptions and runtime monitors for calibration, freshness,
distribution, sensor, timing, and environment facts that Lean cannot establish from source alone.

Useful current surfaces include Mathlib's
[asymptotics API](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/Asymptotics/Lemmas.html),
[probability kernels](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Probability/Kernel/Defs.html),
the lawful discrete [PMF monad](https://leanprover-community.github.io/mathlib4_docs/Mathlib/Probability/ProbabilityMassFunction/Monad.html),
Lean's logical [floating-point model](https://lean-lang.org/doc/reference/latest/Basic-Types/Floating-Point-Numbers/),
and SampCert's separation of proof, extraction, testing, statistics, and benchmarking
([reproduction guide](https://github.com/leanprover/SampCert/blob/39a9056470deb2dd2c047f5fd158423725d3e5e2/REPRODUCING.md)).

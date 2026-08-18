# Refinement patterns for the executable referee — primary-source survey

Commissioned 2026-08-18 for the `flb.type.v0` executable-referee lane.
The question was whether six mature traditions contain reusable proof and
module patterns for moving from a Lean ground-truth model to independently
gated implementations without pretending that agreement is refinement.

## Verification discipline

- `[V]` means the linked primary source was fetched and the cited claim was
  read during live research on 2026-08-18.
- `[V-abstract]` means only the author/publisher abstract or project overview
  was live-verified; no theorem-detail claim depends on it.
- `[V-cache]` means a search index returned the primary page and its content
  during live research, but a direct fetch of the cited URL now returns 404.
  Such evidence is retained as historical build context, never as a claim
  that the artifact remains downloadable or reproducible today.
- `[L]` means repository source was read locally. Where a gate result is
  reported, the gate was run on this checkout on 2026-08-18.
- `[I]` marks an inference made by this report from verified sources. It is
  not a claim made verbatim by the cited authors.
- `[U]` would mark a training-knowledge lead that was not live-verified. There
  are **no `[U]` claims in the findings below**. Training knowledge was used
  only to seed searches, not as evidence.

Primary-source policy here is strict: official project repositories and
documentation, authors' or publishers' papers, and the repository itself.
Secondary surveys were not used to establish findings.

## Executive result

Five patterns transfer, with qualifications:

1. **Package operations separately from their law witness.** A public
   instance is earned by constructing the law bundle; merely defining the
   operations is not admission.
2. **Make the refinement relation an owned artifact.** Prove initialization,
   final/refusal observations, and step matching against it; use a
   well-founded rank only where one step really changes granularity.
3. **Compose small refinements, not one estate-wide leap.** Each seam has its
   own abstraction relation and assumptions. Composition is a theorem whose
   premises must be visible.
4. **Generate and gate the obligations.** An interpretation, layer, or pass is
   accepted only when its complete obligation set is discharged; enumerate
   proof footprints and make the gate demonstrate that it can reject a
   weakened law.
5. **Keep proof transport separate from executable conformance.** The proof
   says what the model entails. Model-authored vectors test a foreign
   executable. Neither substitutes for the other.

The corresponding anti-patterns are equally important:

- copying constructors across languages and calling the resemblance a
  refinement;
- hiding fuel, stuttering, determinism, receptiveness, or rely/guarantee
  premises inside automation;
- allowing a broad module build to stand in for a complete obligation or
  axiom-footprint census;
- importing a rich module ecosystem into the two zero-dependency Lean
  packages merely to imitate another prover's convenience layer; and
- treating a tutorial containing `Admitted` or `Axiom` as a checked artifact.

## 1. Iris CMRA instance construction

### Concrete code and proofs

`[V]` Iris separates operations from laws. Primitive operations and validity
live outside the proof bundle; `CmraMixin` then collects non-expansiveness,
indexed validity, algebraic laws, core monotonicity, and a constructive
extension law. Only after those fields are supplied is the packed `cmra`
structure constructed:

- [`CmraMixin` and the packed `cmra`](https://github.com/rocq-iris/iris/blob/master/iris/algebra/cmra.v#L47-L102)
- [`CmraMorphism`](https://github.com/rocq-iris/iris/blob/master/iris/algebra/cmra.v#L421-L430),
  which requires non-expansiveness and preservation of validity, core, and
  composition.

`[V]` The `gmap` instance is the concrete pattern rather than just framework
prose. It declares operation and validity instances, proves observation
lemmas such as lookup-through-operation, discharges `CmraMixin` pointwise,
and then registers `gmapR`/`gmapUR` as canonical structures:

- [operations and validity](https://github.com/rocq-iris/iris/blob/master/iris/algebra/gmap.v#L220-L241)
- [mixin proof and canonical registration](https://github.com/rocq-iris/iris/blob/master/iris/algebra/gmap.v#L277-L332)
- [`gmap_fmap_cmra_morphism`](https://github.com/rocq-iris/iris/blob/master/iris/algebra/gmap.v#L816-L828),
  lifting a lawful element morphism through the map.

`[V]` The current authoritative construction is itself an instance of a more
generic `view` camera. `auth.v` defines the compatibility relation, proves the
small relation-law interface, and reuses the generic construction rather than
re-proving the whole algebra:

- [`auth` relation, obligations, and reuse of `view`](https://github.com/rocq-iris/iris/blob/master/iris/algebra/auth.v#L16-L91)
- [the authoritative/fragment interpretation in *Iris from the Ground Up*,
  section 6.3.3](https://www.mpi-sws.org/~dreyer/papers/iris-ground-up/paper.pdf#page=49).

`[V]` The approximation index is not disposable bookkeeping. The CMRA
extension field returns decomposition witnesses. In `auth`, unindexed
validity supplies a witness per step index, not one global witness; the
simpler inclusion result needs `CmraDiscrete`:

- [constructive extension field](https://github.com/rocq-iris/iris/blob/master/iris/algebra/cmra.v#L64-L68)
- [the discrete-assumption boundary in `auth`](https://github.com/rocq-iris/iris/blob/master/iris/algebra/auth.v#L405-L446)
- [the original CMRA extension discussion in *Higher-Order Ghost State*](https://iris-project.org/pdfs/2016-icfp-iris2-final.pdf#page=8).

`[V]` A concrete failed-instance discussion shows why those witness types are
load-bearing: an attempted multiset camera could not produce the extension
axiom's computational sigma witness from permutation evidence living only in
`Prop`. See [Iris issue 417](https://gitlab.mpi-sws.org/iris/iris/-/issues/417).

### Module and gate assumptions

`[V]` This convenience is not zero-cost. Iris assumes Rocq canonical
structures, typeclasses, coercions, std++, ssreflect, Rocq-Elpi, opam, and a
separate CI environment. The [official build instructions](https://github.com/rocq-iris/iris#building-iris)
and [repository layout](https://github.com/rocq-iris/iris#directory-structure)
make those dependencies explicit.

`[V]` Its CI is correspondingly broad: multiple Rocq releases plus
development/nightly, warnings-as-errors, a Dune build path, and nightly
`coqchk`; it sets `CPU_CORES=10` while disabling native compilation to avoid
growing the trusted base. Expensive merge-request jobs require a `CI-full`
label. See the [official CI configuration](https://github.com/rocq-iris/iris/blob/master/.gitlab-ci.yml).

`[V]` Iris also records a tooling failure mode: primitive projections and
deeply stacked combinators can confuse typeclass/canonical-structure
resolution, so the code carries explicit unfolding strategy
([`cmra.v`](https://github.com/rocq-iris/iris/blob/master/iris/algebra/cmra.v#L73-L120)).

### Transfer and refusal

`[I]` Transfer the **shape**, not the Rocq machinery: executable operations
first; a `Lawful...` structure containing the precise obligations; small
observation lemmas used to lift lawfulness through containers; explicit
constructors retained even if Lean instances provide notation.

`[I]` For the TyX referee, bounded fuel is analogous to a CMRA index only in
one disciplined sense: a theorem about every bound is not automatically an
unbounded witness. Keep fuel in statements and vectors until a computable
sufficient-bound theorem discharges it. The analogy does not license importing
step-indexed logic.

## 2. CompCert simulation refinement

### Concrete code and proofs

`[V]` CompCert's generic small-step library exposes the actual simulation
ingredients rather than a single black-box equivalence: transition relations
carry observable traces; reflexive-transitive `star`, nonempty `plus`, finite
`starN`, and coinductive infinite behaviors are separate definitions. See the
official generated source for [`Smallstep`](https://compcert.org/doc/html/compcert.common.Smallstep.html).

`[V]` In the same module, [`fsim_properties`](https://compcert.org/doc/html/compcert.common.Smallstep.html#fsim_properties)
requires a well-founded index order, preservation of public symbols, matching
initial and final states, and matching each source step by either target
progress or target stuttering with a strictly smaller index. The rank prevents
infinite source progress from being matched by infinite target silence.
[`compose_forward_simulations`](https://compcert.org/doc/html/compcert.common.Smallstep.html#compose_forward_simulations)
builds the composite witness with paired indices, a lexicographic order, and
an existentially hidden intermediate state.

`[V]` A representative pass proof is
[`Selectionproof.transf_program_correct`](https://compcert.org/doc/html/compcert.backend.Selectionproof.html).
It supplies:

- source/target `match_states` (strengthened with source well-typedness);
- matching initial states;
- matching final states; and
- per-source-step target progress, allowing zero or more target steps and a
  well-founded measure for stuttering.

`[V]` The whole compiler does not re-prove one monolithic relation. The
[`Compiler` semantic-preservation proof](https://compcert.org/doc/html/compcert.driver.Compiler.html)
composes the forward simulation theorem for each pass. It then derives a
backward simulation using additional, named premises: source receptiveness and
target determinacy. The same module separately proves the linked-compilation
case, conditional on successful per-unit compilation and linking.

`[V]` The behavioral payoff is also stated separately. The
[`Behaviors` module](https://compcert.org/doc/html/compcert.common.Behaviors.html)
proves that forward simulation preserves every non-wrong source behavior,
while its backward-simulation results retain an explicit source-safety
condition. Observable traces, termination, divergence, and going wrong are
not collapsed into one Boolean.

### Module and gate assumptions

`[V]` Composition assumes that passes share CompCert's `semantics`/trace
interfaces and that each pass exports a simulation theorem of the expected
shape. Converting direction is not free: determinacy and receptiveness are
load-bearing. Separate compilation adds linker-success premises. These are
logical interface assumptions, not merely build settings.

`[V]` Current CI builds six Linux targets in a Coq container
(`aarch64`, `arm`, `ppc`, `riscv`, `x86_32`, `x86_64`), then runs hygiene and
three test configurations; macOS runs an analogous build/test path. There is
no separately visible status per compiler-pass theorem. See the
[official workflow](https://github.com/AbsInt/CompCert/blob/master/.github/workflows/build.yml).

`[I]` A green CompCert build is evidence that Rocq checked the instantiated
proof graph; the reusable pattern for foldlab is the theorem graph, not
CompCert's package topology.

### Transfer and refusal

`[I]` The closest TyX bridge should name at least four obligations:

1. bytes admitted by the implementation parse to a related Lean term, or both
   return the same structural refusal;
2. related inputs normalize to related outputs;
3. final canonical bytes and path/law coordinates agree at the observation
   boundary; and
4. any implementation-only internal steps preserve the relation under an
   explicit decreasing measure.

Do not add a rank because CompCert has one. Add it only if one Lean referee
step corresponds to several Go/TS steps or vice versa. Otherwise a direct
step simulation is the stronger, simpler obligation.

## 3. seL4 refinement layers

### Concrete code and proofs

`[V]` The official [`seL4/l4v` repository](https://github.com/seL4/l4v)
is organized by refinement seam rather than by one end-to-end proof file:

- `proof/refine`: abstract specification to executable design specification;
- `proof/crefine`: design specification to C semantics;
- `proof/asmrefine`: Isabelle/HOL part of binary verification; and
- `proof/drefine`: capDL to the abstract specification.

The specifications are independently visible: the functional abstract spec,
the generated design spec from Haskell, generated C semantics, and capDL.
Generic libraries include nondeterministic state monads, a monadic VC
generator, invariant automation, and proof-producing C abstraction tools.

`[V]` Generated sources are part of the proof boundary, not an incidental
pre-build. The repository explicitly warns that some proof sessions cannot be
built correctly with bare `isabelle build`; `run_tests` or the supplied
Makefiles must regenerate the Haskell- and C-derived specifications first.
The same README records the resource envelope: most proofs under 4 GiB,
C-refinement work around 16 GiB, with useful scaling to about eight cores.

`[V]` The design-refinement layer does not use an unnamed global relation.
[`StateRelation.thy`](https://github.com/seL4/l4v/blob/master/proof/refine/StateRelation.thy)
defines it, while [`Corres.thy`](https://github.com/seL4/l4v/blob/master/proof/refine/Corres.thy)
specializes the generic correspondence calculus and function proofs use that
specialization. At the top,
[`Refine.thy`](https://github.com/seL4/l4v/blob/master/proof/refine/Refine.thy#L822-L850)
combines initialization, function correspondence, and abstract/concrete
invariants into `fw_sim_A_H`, then applies `sim_imp_refines` to obtain the
refinement theorem.

`[V]` The official functional-correctness paper describes refinement as
forward simulation over the explicit state relation, supports nondeterministic
successor sets, and composes the adjacent refinement steps transitively. It
also deliberately keeps user and machine behavior nondeterministic and common
across layers, changing only kernel behavior and representation. See
[*seL4: Formal Verification of an OS Kernel*, sections 2.3 and 4.5](https://sel4.systems/Research/pdfs/sel4-formal-verification-os-kernel.pdf).

### Module and gate assumptions

`[V]` seL4 assumes an Isabelle session graph plus synchronized external source
trees and generated specifications. Architecture is a gate parameter
(`ARM`, `ARM_HYP`, `X64`, `RISCV64`, `AARCH64`), and `ARM` has the broadest
proof coverage. A release manifest pins compatible kernel, proof, and Isabelle
revisions ([official release documentation](https://docs.sel4.systems/releases.html)).

`[V]` `Refine` and `CRefine` are separately runnable sessions
([design-refinement build](https://github.com/seL4/l4v/tree/master/proof/refine#building),
[C-refinement build](https://github.com/seL4/l4v/tree/master/proof/crefine#building)).
Current pull-request CI fans out across five architectures using remote proof
infrastructure and explicitly excludes the large `AutoCorresSEL4` session; see
the [official proof workflow](https://github.com/seL4/l4v/blob/master/.github/workflows/proof.yml).

`[I]` The transferable pattern is **named intermediate semantics plus a proof
per seam**. The non-transferable part is assuming that foldlab should acquire
generated Haskell/C semantics or Isabelle's session/module stack. The present
Lean packages intentionally have no Lake dependencies.

### Transfer and refusal

`[I]` Keep the TyX mathematical syntax/semantics, executable Lean referee,
canonical-byte emitter, and foreign implementations as distinguishable
layers. A generated fixture is an observation across one seam, not the seam's
refinement proof. The moves model's admitted/refused mismatch is exactly the
kind of semantic layer difference that must remain named until a relation
covers it.

## 4. Back/von Wright refinement-calculus tradition

### Concrete discussions and proofs

`[V]` Back's author-deposited technical report
[*Refinement Calculus, Lattices and Higher Order Logic*](https://authors.library.caltech.edu/records/g8wz6-xmv53)
builds the calculus as a lattice of monotone predicate transformers. Its
abstract states that the framework expresses data refinement and proves a
data-refinement theorem with stuttering. The attached report PDF is available
from the same primary record.

`[V]` The authors' systematic treatment makes correctness a special case of
refinement and develops predicate transformers, refinement order, choice,
statement correctness/refinement, data refinement, iteration, recursion,
procedures, and action systems. See the publisher record for
[*Refinement Calculus: A Systematic Introduction*](https://link.springer.com/book/10.1007/978-1-4612-1674-2).

`[V-abstract]` Their earlier HOL mechanization is not just paper algebra. The
author-uploaded abstract of
[*Refinement Concepts Formalised in Higher Order Logic*](https://doi.org/10.1007/BF01888227)
states that commands with weakest-precondition semantics, refinement rules,
and refinements of actual program texts were mechanized in HOL.

`[V-abstract]` In the reactive/action-system branch, Back and von Wright's
[*Trace Refinement of Action Systems*](https://doi.org/10.1007/BFb0015020)
defines behavioral refinement by traces and gives a simulation proof rule,
complete under stated restrictions. This is the useful bridge between the
predicate-transformer tradition and transition-system simulation.

`[V]` There is also current, executable proof code by Back and Preoteasa in
the Archive of Formal Proofs, not merely a historical abstract. The
[`DataRefinementIBP` entry](https://isa-afp.org/entries/DataRefinementIBP.html)
models statements as monotone predicate transformers, defines assert,
assume, demonic and angelic updates, proves their monotonicity and Hoare
rules, gives invariant diagrams fixed-point semantics, and proves diagram
data-refinement theorems. The
[`Statements`, `Hoare`, `Diagram`, and `DataRefinement` theories](https://www.isa-afp.org/browser_info/current/AFP/DataRefinementIBP/document.pdf)
are published as checked Isabelle source; the live AFP release is dated
2026-02-06 for Isabelle2025-2. In particular, the mechanization keeps the
demonic/angelic distinction executable in the definitions instead of
flattening nondeterminism into prose.

### Module and gate assumptions

The reusable theory does **not** assume a modern package manager, public
module-signature discipline, or CI gate. Its native assumptions are semantic:
complete lattices/order, monotonicity, predicate-transformer healthiness,
and, for data/action refinement, a representation or simulation relation plus
stuttering/trace premises.

`[V]` The current AFP mechanization does add a concrete module/build
assumption: an Isabelle session `DataRefinementIBP`, split into five theories,
and the AFP `LatticeProperties` dependency. This is useful reproducible proof
evidence, but still not a module-refinement calculus for Go, TypeScript, or
Lean packages.

`[I]` Therefore it is an error to cite refinement calculus as evidence that a
particular Go/TS/Lean build graph is modular. It gives the semantic order and
calculation laws; CompCert, seL4, IMPS, and CertiKOS supply the more concrete
module and proof-transport patterns.

### Transfer and refusal

`[I]` The important transfer is directionality: implementation behavior must
be below the abstract allowance in the chosen refinement order. A symmetric
digest-equality wall is useful evidence but discards that order and cannot
express implementation refusal, abstract underspecification, or stuttering.

## 5. IMPS theory interpretations / morphisms

### Concrete code, obligations, and proof transport

`[V]` IMPS makes “little theories” literal: theories are nodes and theory
interpretations are theorem-preserving translations used as conduits between
them. See the official manual's
[*Little Theories*](https://imps.mcmaster.ca/manual/node10.html) and
[*Theory Interpretations*](https://imps.mcmaster.ca/manual/node14.html).

`[V]` A translation is a pair `(mu, nu)`: `mu` maps source atomic sorts into
target sorts/predicates/sets and `nu` maps source constants to target
expressions. It becomes an interpretation only when it maps theorems to
theorems. IMPS reduces that global condition to a generated finite obligation
surface:

- translated primitive axioms;
- translated definition axioms;
- source-sort nonemptiness;
- primitive-constant definedness in its sort; and
- sort inclusion.

The manual's Interpretation Theorem says discharging every obligation is
sufficient. A `def-translation` triggers syntactic checks, obligation
generation, installed-theorem matching, and optional simplification; the
translation is marked as an interpretation only when no obligation remains.
Outstanding formulas are printed for the user to prove and install.

`[V]` The manual gives executable source forms, not just a category-theory
diagram. `MONOID-THEORY-TO-ADDITIVE-RR` maps the carrier to reals, the identity
to zero, and multiplication to addition, then requests
`theory-interpretation-check using-simplification`. `MUL-REVERSE` maps left
cancellation to right cancellation; `FIELDS-TO-RR` drives a theory instance
of vector spaces. The official
[*IMPS Theory Library*](https://imps.mcmaster.ca/theories/theory-library.html)
lists the live graph of theories, translations, and transported theorems.

`[V]` The transport surface is broad but explicit: install a translated
theorem, assume it during a proof, instantiate it, expose it as a transportable
rewrite/macete, transport definitions, instantiate parameter theories, or
prove model-conservative extension via an interpretation that fixes the base
theory.

### Module and gate assumptions

`[V]` IMPS assumes named source/target theories, globally installed theorems,
sort/constant association tables, and a theory database that can enrich a
translation when definitions change. Its analogue of a gate is the empty
outstanding-obligation set; the primary sources examined do not establish a
modern CI workflow.

`[V]` Its own cautions are directly relevant. Nonnormal translations can cause
a “devastating explosion” of quasi-constructors. Translation enrichment can
be stale, causing unexpected behavior until the relevant translation form is
re-evaluated. See [section 9.6](https://imps.mcmaster.ca/manual/node14.html).

### Transfer and refusal

`[I]` A TyX bridge should look more like an IMPS translation than a copied AST:
an explicit mapping of constructors, scalars, fields, refusals, and
observations, followed by generated obligations. The gate should report the
first outstanding constructor/law pair and refuse to call the bridge a
refinement until the list is empty.

`[I]` Do not add a general theory-graph framework to `verify/ir`. A fixed,
small relation and generated obligation roster capture the useful idea while
preserving core-only Lean. Also pin translation/enrichment inputs by digest so
the stale-enrichment failure cannot become a silent green.

## 6. CertiKOS certified abstraction layers

### Concrete code and proofs

`[V]` CertiKOS defines a sequential certified layer as an underlay interface,
an implementation module, an overlay interface, and a mechanized simulation
witness. An interface contains abstract state and primitives; correctness is
contextual: for every client `P`, linking `P` with the implementation below
the layer refines running `P` against the overlay. The concurrent calculus
adds focused thread sets, event logs, environment strategies, and explicit
rely/guarantee compatibility. See the primary
[*Certified Concurrent Abstraction Layers* paper](https://flint.cs.yale.edu/certikos/publications/ccal.pdf)
and the [project framework overview](https://flint.cs.yale.edu/certikos/framework.html).

`[V]` The paper's Soundness Theorem 2.2 lifts a certified module judgment to
all clients. Its parallel composition rule requires each side's guarantee to
imply the other's rely condition. Multicore and multithreaded linking theorems
then connect the focused local layers back to the whole machine. These are
composition premises, not conventions hidden in a linker.

`[V]` The official Coq tutorial provides a small concrete layer:
[`tutorial.stack.Stack`](https://certikos.github.io/tutorial-coqdoc/tutorial.stack.Stack.html).
It defines abstract stack data and an invariant, high-level primitives, C
modules, low-level specifications over a counter underlay, a memory-to-stack
`match_data` relation, and a `relate_data` condition equating stack length with
the counter. `get_size_refine` and `push_refine` show the per-primitive proof
shape; the intended final theorem composes `counter_R`, `stack_R`, modules,
and vertical composition.

`[V]` That tutorial is also a valuable negative example: `pop_code`,
`pop_refine`, and the final link are deliberately exercises containing
`Admitted`, and it declares `Axiom stack_link`. It is pedagogical source, not a
closed proof artifact. A bulk build that permits these escape hatches must not
be treated as certification evidence.

`[V-cache]` The official CCAL artifact report is unusually candid about build
cost. Its historical instructions describe a smaller CCAL package taking
under five hours with `make -j8` on an eight-core, 32-GiB machine, and a much
larger full mC2 build, under Ubuntu 16.04, OCaml 4.01, and Coq 8.4.6. The
search index returned the primary report during this survey, but the direct
URL now returns 404; therefore this is retained only as historical cost and
toolchain evidence, not as a presently reproducible build. See
[*Certified Concurrent Abstraction Layers and Concurrent CertiKOS Artifacts*](https://certikos.github.io/certikos-artifact/).

### Module and gate assumptions

CertiKOS assumes a layer algebra, explicit underlay/overlay interfaces,
CompCertX semantics, module linking, abstract-data relations, and—for the
concurrent result—logs, environment strategies, and rely/guarantee
compatibility. The historical full artifact is a pinned legacy environment
and a multi-day proof build, not a drop-in dependency for this repository.

### Transfer and refusal

`[I]` The strongest transfer is the judgment shape:

```text
underlay |- (relation, implementation) : overlay
```

For foldlab, the implementation side is not only executable code; it includes
the parse/normalization/canonical-byte pipeline and its refusal behavior. The
relation must connect all of those observations. Each constructor family can
be certified separately, then composed under one top-level relation theorem.

`[I]` Refuse the heavyweight transplant. A multi-day Coq artifact would
saturate compute, but would not discharge a TyX obligation and would violate
the lane's dependency and toolchain discipline. If retained as an estate
reference at all, it belongs outside gates with its environment and expected
cost documented, analogous to the read-only `repos/` convention.

## Cross-source pattern table

| Pattern | Primary precedents | Hidden assumption to surface | TyX-referee reading |
| --- | --- | --- | --- |
| Operations plus law witness | Iris CMRA mixins; IMPS interpretation obligations; CertiKOS layer judgments | Instance search and theorem installation are coherent and complete | Keep executable defs callable; public admission requires a rostered `Lawful...` witness |
| Owned simulation relation | CompCert `match_states`; seL4 refinement seams; Back/von Wright data refinement; CertiKOS `simrel` | Observation alphabet, direction, and stuck/refusal semantics are fixed | Relate terms, refusals, canonical bytes, and resolver/fuel state explicitly |
| Small layers, composed theorem | Per-pass CompCert; abstract/design/C/binary seL4; IMPS theory graph; CertiKOS vertical/parallel composition | Every seam's side conditions and generation inputs are pinned | Prove constructor/pipeline seams separately; do not declare end-to-end until composition checks |
| Generated obligation gate | IMPS outstanding obligations; seL4 generated spec sessions; local fabric theorem/footprint roster | The generator itself and its input revision are part of the TCB | Generate a complete constructor/law matrix and fail on any orphan or outstanding row |
| Explicit stuttering/index bound | CompCert well-founded simulation; Back/von Wright stuttering; Iris step indices | A bounded family is not an unbounded witness; silent steps must make progress | State fuel and any rank in theorem names, emitted evidence, and ledger bounds |

## Stress test against this repository

### The two zero-dependency packages are intentionally different

`[L]` Both [`verify/ir/lake-manifest.json`](../../verify/ir/lake-manifest.json)
and [`verify/fabric/lake-manifest.json`](../../verify/fabric/lake-manifest.json)
have empty `packages` arrays and both pin Lean 4.33.0. That shared constraint
rules out directly copying Iris's std++/ssreflect/canonical-structure stack or
CertiKOS's CompCertX/layer library.

`[L]` [`verify/ir`](../../verify/ir/README.md) is the small semantic kernel:

- mutual inductives make the grammar and its one hole-bearing nonterminal
  structural;
- `TyX Empty` and `TyX Unit` distinguish closed and authoring terms;
- `conforms` is an executable, fuel-indexed Boolean and `Conforms` is its
  existential limit;
- eight named theorem families cover close/embed, brand/check invisibility,
  reference unfolding, union extensionality, sort preservation, and resolver
  monotonicity; and
- its gate scans for `sorry`, `admit`, and source `axiom`, then runs
  `lake build`.

`[L]` [`verify/fabric`](../../verify/fabric/README.md) is already the stronger
proof-to-artifact pattern:

- definitions, statements, proofs, mutants, controls, canonical encoding, and
  emission live in distinct files;
- the gate pins that partition and the private-theorem set;
- every public theorem is rostered and its kernel axiom footprint checked;
- sixteen law-dropping controls must be refuted with committed traces; and
- 27 model vectors name exact witness theorems and must regenerate
  byte-for-byte.

`[L]` On 2026-08-18 both gates were run concurrently from Git for Windows
Bash and passed. `verify/ir` built successfully (five build jobs).
`verify/fabric` built its library and two executables, checked a **206-theorem
roster and footprint**, refuted all **16** controls, and regenerated all
**27** vectors byte-identically. Parallel wall time for the two commands was
about 26 seconds on this seat. A first attempt through WSL's `bash` failed
before building because only `lake.exe`, not the command name `lake`, was
visible; this is an entrypoint/environment mismatch, not a proof failure.

### Fit of the five patterns

1. **Law witness: strong fit.** TyX already has law statements, but no single
   executable-referee admission witness. Iris suggests one proof bundle over
   small observation lemmas. Keep it explicit and core-only.

2. **Owned relation: mandatory fit.** The repository itself says the
   moves↔daemon gap is held. CompCert/CertiKOS show why: the relation and the
   initial/step/final/refusal obligations are the work. Generated vectors can
   attack the implementation after that relation is stated; they cannot
   invent it.

3. **Layered composition: fit with a packaging constraint.** Do not make
   `verify/ir` depend on `verify/fabric` or vice versa. If a future bridge
   needs shared laws, the design decision is whether to duplicate a tiny
   statement, add a third independently gated bridge package, or promote a
   core-only common package. That choice is load-bearing and must be grilled
   before machinery; this report does not decide it.

4. **Generated obligations: `fabric` proves feasibility; `ir` has a gap.**
   The IR gate currently has no complete theorem/footprint roster, no
   law-dropping controls, no executable emitter, and no regeneration wall.
   The active lane already calls for those increments. Port the gate *shape*,
   not Fabric's unrelated algebra.

5. **Fuel/rank visibility: mandatory fit.** `Resolver` is currently a bare
   function and conformance uses fuel. Iris and CompCert both warn, in
   different formalisms, against erasing the bound without a witness. A
   concrete finite catalog, acyclicity/depth evidence, and a sufficient-fuel
   theorem must precede an unqualified executable verdict.

### Gate obligations suggested by the survey

This is a research-derived checklist, not a ratified build spec:

- **Relation declaration:** source/target states, observation alphabet,
  direction, and what counts as refusal/stuck/silent.
- **Initialization:** parser/canonical input establishes the relation or both
  sides return the same typed refusal.
- **Step preservation:** each normalize/parse/conformance transition is
  matched, with an explicit rank for any silent multi-step case.
- **Observation:** canonical bytes, structural digest inputs, first refusal
  path, law id, and fuel-exhaustion status agree.
- **Composition:** per-constructor obligations compose into the full grammar;
  no orphan constructor or theorem.
- **Kernel footprint:** every public bridge theorem is enumerated and has only
  the approved axiom footprint.
- **Negative controls:** one relation/law premise dropped at a time, each
  killed on its named observation.
- **Executable wall:** theorem-indexed Lean vectors, regenerated
  byte-for-byte, replayed by each foreign implementation.
- **Bounds ledger:** finite catalog/fuel domain, string and numeric grammar,
  comparator, and cross-platform emission assumptions named in
  `VERIFICATION.md`.

## Anti-pattern audit

### A. “The structures look the same”

CompCert and CertiKOS do not certify by textual resemblance; they define a
state relation and prove transition/observation obligations. Copying Lean
constructors into Go is therefore evidence of neither direction of
refinement. It may make the missing relation harder to see.

### B. “One green build means all obligations were checked”

IMPS distinguishes a syntactically valid translation from an interpretation
whose obligation set is empty. The CertiKOS tutorial visibly contains
`Admitted` and `Axiom` despite showing much real proof code. A gate must census
claims and escape hatches, not trust project scale or reputation.

### C. “Automation removes the assumption”

Iris canonical structures have resolution-depth failure modes; IMPS
translations need enrichment; seL4 sessions need regenerated specs;
CompCert's forward-to-backward conversion needs receptiveness and
determinacy; CCAL parallel composition needs rely/guarantee compatibility.
Automation packages premises. It does not erase them.

### D. “A heavyweight build is stronger evidence for this lane”

The CertiKOS full artifact is a useful primary source and a genuine stress
build. It is not evidence about TyX. Saturating compute is only valuable when
the build discharges an estate claim. For this lane, the highest-value compute
targets are exhaustive/bounded Lean emission, mutation controls, replay in the
two foreign implementations, and cross-platform byte regeneration.

### E. “A finite wall is the refinement theorem”

The local fabric gate correctly calls its vectors a conformance corpus and
ties every row to a theorem witness. That is unusually strong test evidence,
but still not code/model refinement. Keep the theorem layer and the wall layer
separate in the ledger.

## Concrete source/build leads to retain in the estate

These are references or optional external stress builds, **not dependencies
of the active Lean packages**:

| Project | Concrete entrypoint | Expected cost / caveat |
| --- | --- | --- |
| Iris | `iris/algebra/cmra.v`, `gmap.v`, `auth.v`; official opam/Dune build and CI | Rich Rocq dependencies; CI uses up to 10 cores and separately scheduled full jobs |
| CompCert | `Smallstep`, `Selectionproof`, `Compiler`, `Behaviors` generated sources | Valuable theorem code; building it does not test TyX |
| seL4/l4v | `run_tests` with an architecture; `proof/{refine,crefine,asmrefine}` | Generated specs required; C refinement about 16 GiB; useful to about 8 cores |
| Back/von Wright | Caltech report PDF, Springer book, HOL/action-system papers, and AFP `DataRefinementIBP` | Current Isabelle/AFP proof code exists; its session depends on `LatticeProperties` |
| IMPS | official manual chapter 9 and theory-library graph | Historical system; empty-obligation protocol is the import, not the runtime |
| CertiKOS/CCAL | tutorial Coqdoc plus the now-unavailable official artifact instructions | Historical Ubuntu/OCaml/Coq pin; cached cost only, direct artifact page currently 404 |

## Bottom line

The external traditions agree on the point this repository is already
protecting: a refinement map is not generated by similarity, code generation,
or a differential wall. It is a separately owned, composable proof object with
visible side conditions. The best immediate import is therefore not a
dependency. It is a gate architecture:

1. state the TyX relation and its observation alphabet;
2. generate the complete obligation roster;
3. discharge and footprint every theorem in core-only Lean;
4. kill one-premise mutants; and only then
5. execute the same definitions to author the foreign-runtime wall.

`verify/fabric` demonstrates that steps 2–5 are practical under this estate's
Lean 4.33.0 and zero-dependency constraints. `verify/ir` supplies the semantic
ground truth but has not yet acquired that referee/gate surface. That gap is
the work; none of the six traditions makes it disappear.

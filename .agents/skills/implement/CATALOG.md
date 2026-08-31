# CATALOG — Program Proofs, tagged

Mechanically rendered from [book-tags.json](book-tags.json) — do not
hand-edit; regenerate from the JSON. Source: .reference/papers/program_proofs.pdf
(sha256 a14a980377…cddf025). Wave: 10x codex gpt-5.6-sol/luna xhigh 2026-08-30,
10 slices, 120 sections. Both role files project THIS set.

### §1.0 — Methods
`background`

Error states:
- Triple returns a value other than three times its input — run_Triple(x).r != 3*x.
- A method changes an in-parameter instead of treating it as read-only — final_x != initial_x.

Laws:
- **Triple input-output relation** — `forall x:int, run_Triple(x).r == 3*x; run_Triple(x).r is the final out-parameter`
  - falsifier: exhibit x with run_Triple(x).r != 3*x
- **In-parameter preservation** — `forall x:int, final_x(run_Triple(x)) == x`
  - falsifier: exhibit x with final_x(run_Triple(x)) != x

Breaker: Treat even a basic method as an input-output relation and look for an input that violates it.
Implementer: Trace assignments symbolically and remember that the final values of out-parameters are the returned values.

### §1.1 — Assert Statements
`assertions, proof-mechanics`

Error states:
- A reachable execution arrives at assert r == 3*x + 1 with r == 3*x, so the assertion is false.
- A few tested inputs pass, but an untested input reaches a false assertion — sampling is mistaken for proof.

Laws:
- **Universal assertion safety** — `forall i, Reaches(i,A) => A(StateAtA(i)); i ranges over all inputs and A is the asserted predicate`
  - falsifier: exhibit input i with Reaches(i,A) && !A(StateAtA(i))

Breaker: Turn each assertion into a universal property over every input and every execution that reaches it.
Implementer: Prove assertions symbolically; successful runs on selected inputs do not discharge the obligation.

### §1.2 — Working with the Verifier
`assertions, lemmas-proofs, proof-mechanics, specification-design`

Error states:
- Triple computes r == 3*x but the specification asserts r == 10*x — the written assertion is wrong except at x == 0.
- A failing early assertion filters out bad executions, making a later assertion appear valid even though the method is not globally correct.
- A true target condition remains unproved because a required precondition, invariant, lemma, or intermediate assertion is missing.

Laws:
- **Assertion filtering plus proof obligation** — `AfterAssert(R,A) == {s | R(s) && A(s)}, while safety requires forall s, R(s) => A(s); R is the reachable-state predicate before assert A`
  - falsifier: exhibit state s with R(s) && !A(s), even if all states in AfterAssert(R,A) satisfy later assertions

Breaker: A verifier error may expose a code defect, specification defect, or missing proof fact; seek a concrete reachable counterexample before classifying it.
Implementer: Localize the gap with intermediate assertions, then supply the missing precondition, stronger invariant, lemma, or proof step without confusing surviving traces with correctness.

### §1.3 — Control Paths
`assertions, proof-mechanics`

Error states:
- The then branch establishes r == 3*x but the else branch returns a different value.
- Two nondeterministic guards overlap and one enabled branch violates the postcondition, even though another enabled branch succeeds.
- A proof uses a branch guard that is false on the execution being analyzed.

Laws:
- **All enabled branches preserve the goal** — `forall s,b, Reach(s) && Enabled(b,s) => Post(Step(b,s)); b ranges over every branch the control construct may choose`
  - falsifier: exhibit state s and enabled branch b with Reach(s) && !Post(Step(b,s))
- **Triple branch agreement** — `forall x,b, EnabledTripleBranch(b,x) => Result(b,x) == 3*x`
  - falsifier: exhibit x and enabled Triple branch b with Result(b,x) != 3*x

Breaker: Quantify over every enabled branch, including every choice in an overlapping nondeterministic case.
Implementer: Analyze each branch under its own guard and prove the common assertion independently for every possible path.

### §1.4 — Method Contracts
`contracts, algebraic-laws, specification-design, abstraction-modules`

Error states:
- A caller relies on a fact visible in the method body but absent from the postcondition, so an alternative valid implementation breaks the caller.
- Triple is called with an odd x although its implementation requires evenness for exact integer division.
- Index is underspecified, but a caller assumes two calls with the same input return equal results.
- Min returns a value below both inputs but not equal to either input — m <= x && m <= y holds while m is not the minimum.

Laws:
- **Implementation satisfies its contract** — `forall x,y, Pre(x) && Returns(M,x,y) => Post(x,y)`
  - falsifier: exhibit x,y with Pre(x) && Returns(M,x,y) && !Post(x,y)
- **Call-site admissibility** — `forall x, LegalCall(M,x) iff Pre(x)`
  - falsifier: exhibit a call argument x with LegalCall(M,x) && !Pre(x)
- **Opaque-client consequence** — `Client claim C is justified iff forall y, Post(x,y) => C(x,y)`
  - falsifier: exhibit x,y with Post(x,y) && !C(x,y)
- **Exact minimum specification** — `MinSpec(x,y,m) iff m <= x && m <= y && (m == x || m == y)`
  - falsifier: exhibit x,y,m with m <= x && m <= y && m != x && m != y

Breaker: Subsections 1.4.0 and 1.4.1 make underspecification testable: search all outputs allowed by the postcondition, not just the current body’s output.
Implementer: Prove preconditions at calls and postconditions at returns; strengthen a specification when an allowed but unintended result defeats a client property.

### §1.5 — Functions
`contracts, algebraic-laws, specification-design, proof-mechanics`

Error states:
- Two invocations of a function with equal arguments produce different results.
- A caller uses a function outside its declared precondition.
- A method returns r != 3*x while satisfying the weaker condition Average(r,3*x) == 3*x.
- A proof treats a transparent function as an unconstrained result instead of unfolding its body.

Laws:
- **Function determinism** — `forall c1,c2, Args(c1) == Args(c2) => Result(c1) == Result(c2); c1 and c2 are invocations of the same function`
  - falsifier: exhibit two invocations c1,c2 with Args(c1) == Args(c2) && Result(c1) != Result(c2)
- **Transparent definition** — `forall a, f(a) == Body_f(a); Body_f is the function body with formal parameters replaced by a`
  - falsifier: exhibit argument a with f(a) != Body_f(a)
- **Function-call admissibility** — `forall a, LegalUse(f,a) iff Pre_f(a)`
  - falsifier: exhibit argument a with LegalUse(f,a) && !Pre_f(a)
- **Exact Triple result** — `forall x, TriplePrime(x) == 3*x`
  - falsifier: exhibit x,r with Average(r,3*x) == 3*x && r != 3*x

Breaker: Demand determinism and unfold transparent definitions; also test whether a function-based specification admits unintended values.
Implementer: Use the function body as an equation, establish its precondition at every use, and strengthen weak result specifications to the intended relation.

### §1.6 — Compiled versus Ghost
`proof-mechanics, specification-design`

Error states:
- A compiled result depends on a ghost variable, so erasing ghost state changes the observable output.
- A compiled computation calls a ghost method for a value that will not exist at run time.
- Ghost assertions or proof computations survive erasure and alter executable behavior or effects.

Laws:
- **Ghost noninterference** — `forall c,g1,g2, CompiledOut(P,c,g1) == CompiledOut(P,c,g2); c is compiled state and g1,g2 are ghost states`
  - falsifier: exhibit c,g1,g2 with CompiledOut(P,c,g1) != CompiledOut(P,c,g2)
- **Erasure preservation** — `CompiledObs(P,input) == CompiledObs(EraseGhost(P),input)`
  - falsifier: exhibit input with CompiledObs(P,input) != CompiledObs(EraseGhost(P),input)

Breaker: Subsection 1.6.0 motivates an erasure test: vary or remove all ghost material and compare compiled observations.
Implementer: Keep proof-only values flowing only into ghost constructs so compilation can erase them without changing executable results.

### §2.0 — Program State
`background, assertions, contracts, wp-sp-calculus`

Error states:
- A state at a program point omits an in-scope variable or assigns a value to a variable that is out of scope.
- MyMethod starts from x == 37 but reaches a state other than x == 37, y == 56, a == 40, b == 16 at program point 9.
- A correctness argument includes an initial state such as x == 2 even though the precondition requires 10 <= x.

Laws:
- **State-domain equals scope** — `dom(StateAt(p)) == Scope(p); dom gives the variables valued by the state at program point p`
  - falsifier: exhibit program point p and variable v with v in exactly one of dom(StateAt(p)) and Scope(p)
- **MyMethod contract over states** — `forall s0,sf, s0.x >= 10 && RunMyMethod(s0,sf) => sf.y >= 25`
  - falsifier: exhibit initial state s0 and final state sf with s0.x >= 10 && RunMyMethod(s0,sf) && sf.y < 25

Breaker: Phrase defects as valuations at named program points and restrict initial valuations with the precondition.
Implementer: Represent predicates as sets of states, track scope changes, and reason over all initial states denoted by the precondition.

### §2.1 — Floyd Logic
`assertions, contracts, wp-sp-calculus, proof-mechanics`

Error states:
- An annotation before a statement holds, but executing the statement reaches a state that violates the next annotation.
- The method precondition does not imply the first body annotation.
- The final body annotation holds but is too weak to imply the method postcondition.

Laws:
- **Decorated-edge preservation** — `forall s,s', A_p(s) && Step(p,q,s,s') => A_q(s'); A_p and A_q annotate adjacent program points`
  - falsifier: exhibit adjacent points p,q and states s,s' with A_p(s) && Step(p,q,s,s') && !A_q(s')
- **Boundary implications** — `forall s, Pre(s) => A_entry(s), and forall s, A_exit(s) => Post(s)`
  - falsifier: exhibit state s with Pre(s) && !A_entry(s), or A_exit(s) && !Post(s)

Breaker: Attack every local transition and both method boundaries; one failed implication refutes the decorated proof.
Implementer: Derive annotations forward from reachable states or backward from the goal, then check every adjacent transition and boundary implication.

### §2.2 — Hoare Triples
`assertions, termination, wp-sp-calculus`

Error states:
- A state satisfies P, but S terminates in a state that does not satisfy Q.
- A state satisfies P, but S crashes before producing a Q-state.
- A state satisfies P, but S diverges instead of terminating.

Laws:
- **Total-correctness Hoare triple** — `Valid({P} S {Q}) iff forall s, P(s) => TerminatesWithoutCrash(S,s) && Q(Final(S,s))`
  - falsifier: exhibit state s with P(s) and either Crash(S,s), Diverge(S,s), or !Q(Final(S,s))

Breaker: A Hoare-triple red test is one initial P-state witnessing a crash, divergence, or final violation of Q.
Implementer: Discharge both functional correctness and total correctness; reaching Q only on successful executions is insufficient.

### §2.3 — Strongest Postconditions and Weakest Preconditions
`algebraic-laws, proof-mechanics, wp-sp-calculus`

Error states:
- Assignment reasoning substitutes the new x into itself incorrectly and accepts a state outside the true weakest precondition.
- A swap loses an old value because the proof lacks logical variables for the initial x and y.
- A simultaneous assignment is analyzed as two sequential assignments, so a right-hand side reads an already-updated variable.
- An uninitialized local is assumed to have a convenient value instead of an arbitrary value of its type.
- A backward proof weakens an intermediate assertion, so the earlier annotation no longer implies the required condition.

Laws:
- **Assignment weakest precondition** — `WP[x := E,Q] == Q[x := E]; substitution replaces post-state x by pre-state expression E`
  - falsifier: exhibit pre-state s with CandidateWP(s) != Q[x := E](s)
- **Simultaneous-assignment substitution** — `WP[x,y := E,F,Q] == Q[x,y := E,F], with E and F both evaluated in the pre-state`
  - falsifier: exhibit pre-state where sequential substitution and simultaneous substitution give different truth values
- **Arbitrary local introduction** — `WP[var x,Q] == forall x, Q`
  - falsifier: exhibit a candidate pre-state accepted even though some initial value of x falsifies Q
- **Assignment strongest postcondition** — `SP[x := E,P] == exists x0, P[x := x0] && x == E[x := x0]; x0 denotes the overwritten value`
  - falsifier: exhibit post-state included by a candidate SP with no old value x0 satisfying the equation
- **Swap relation** — `forall X,Y, RunSwap(X,Y) == (Y,X)`
  - falsifier: exhibit X,Y with RunSwap(X,Y) != (Y,X)

Breaker: Subsections 2.3.0-2.3.4 supply the main attacks: preserve old values, distinguish simultaneous from sequential updates, and quantify uninitialized locals universally.
Implementer: Work backward by substitution, simplify as you go, and only strengthen backward annotations; use fresh logical variables or existential old values when updates overwrite information.

### §2.4 — WP and SP
`algebraic-laws, proof-mechanics, wp-sp-calculus`

Error states:
- A transformer computes WP forward or SP backward, reversing the dependency order.
- A simultaneous assignment uses lists of mismatched lengths or non-simultaneous substitution.
- Local-variable introduction uses existential quantification in WP or universal quantification in SP.

Laws:
- **Assignment transformer pair** — `WP[x := E,Q] == Q[x := E] and SP[x := E,P] == exists x0, P[x := x0] && x == E[x := x0]; x,E,x0 may be equal-length lists`
  - falsifier: exhibit assignment and predicate for which either computed transformer differs from the stated predicate
- **Local-introduction transformer pair** — `WP[var x,Q] == forall x, Q and SP[var x,P] == exists x, P`
  - falsifier: exhibit predicate where a candidate transformer uses the opposite quantifier and changes the truth value

Breaker: Instantiate the transformer equations from Subsections 2.4.0-2.4.1 and compare predicates extensionally.
Implementer: For goals, compute WP backward; for reachable facts, compute SP forward, preserving simultaneous list substitution and the correct quantifiers.

### §2.5 — Conditional Control Flow
`assertions, proof-mechanics, wp-sp-calculus`

Error states:
- The proof checks only the then branch and accepts a state whose else execution violates the goal.
- The strongest postcondition conjoins branch results, losing states reachable through exactly one branch.
- A branch is analyzed without conjoining or assuming its guard.
- A nested conditional is simplified as though an infeasible inner branch were feasible.

Laws:
- **Conditional strongest postcondition** — `SP[if B {S} else {T},P] == SP[S,P && B] || SP[T,P && !B]`
  - falsifier: exhibit a post-state reachable through one guarded branch that a candidate SP excludes, or an unreachable state it includes
- **Conditional weakest precondition** — `WP[if B {S} else {T},Q] == (B => WP[S,Q]) && (!B => WP[T,Q])`
  - falsifier: exhibit pre-state s accepted by a candidate WP where the branch selected by B fails Q

Breaker: Subsection 2.5.0 gives the red-test equations: split by the guard and demand correctness of whichever branch is selected.
Implementer: Conjoin guards when moving forward, assume guards when moving backward, disjoin branch SP results, and conjoin guarded WP obligations.

### §2.6 — Sequential Composition
`proof-mechanics, wp-sp-calculus`

Error states:
- WP for S;T is computed in source order, so T's requirement is not propagated backward through S.
- SP for S;T applies T before S, reversing the actual execution order.
- Two sequential assignments are treated as one simultaneous assignment and therefore read different values.

Laws:
- **Sequential SP composition** — `SP[S;T,P] == SP[T,SP[S,P]]`
  - falsifier: exhibit P,S,T and post-state where a candidate SP differs from SP[T,SP[S,P]]
- **Sequential WP composition** — `WP[S;T,Q] == WP[S,WP[T,Q]]`
  - falsifier: exhibit P,S,T,Q and pre-state accepted by a candidate WP but rejected by WP[S,WP[T,Q]], or conversely

Breaker: Use order-sensitive programs to distinguish sequential composition from reversal or simultaneous execution.
Implementer: Push reachable facts through S then T, but pull a desired postcondition through T then S.

### §2.7 — Method Calls and Postconditions
`abstraction-modules, contracts, proof-mechanics, wp-sp-calculus`

Error states:
- A caller proves a property by inspecting the current method body although the postcondition permits another implementation that violates it.
- Formal and actual parameter names capture one another because the call semantics does not use fresh names.
- An underspecified output is treated existentially, so the proof chooses one favorable result instead of covering every result allowed by the postcondition.

Laws:
- **Assumption transformers** — `WP[assume E,Q] == (E => Q) and SP[assume E,P] == P && E`
  - falsifier: exhibit state where a candidate assume transformer has a different truth value
- **Opaque-call weakest precondition** — `WP[t := M(E),Q] == forall y', R[x,y := E,y'] => Q[t := y']; R is M's postcondition and y' is fresh`
  - falsifier: exhibit E,Q,y' with R[x,y := E,y'] && !Q[t := y'] although the candidate precondition accepts the call

Breaker: Subsections 2.7.0-2.7.2 require fresh renaming and universal quantification over every result admitted by the postcondition.
Implementer: Desugar a call into fresh parameters, actual-input assignment, postcondition assumption, and output assignment; never use the opaque body at the call site.

### §2.8 — Assert Statements
`assertions, proof-mechanics, wp-sp-calculus`

Error states:
- An assertion is treated as an assumption, so E is used without proving that it holds.
- An SP-only argument declares assert E safe because it describes only crash-free executions and omits the crash obligation.
- A method postcondition is assumed at calls even though no proof establishes it for the method body.

Laws:
- **Assert weakest precondition** — `WP[assert E,Q] == E && Q`
  - falsifier: exhibit state s with Q(s) && !E(s) that a candidate precondition accepts
- **Assume weakest precondition** — `WP[assume E,Q] == E => Q`
  - falsifier: exhibit state s where a candidate assume precondition differs from E(s) => Q(s)
- **SP cannot distinguish assert from assume** — `SP[assert E,P] == SP[assume E,P] == P && E`
  - falsifier: exhibit P,E and post-state where either SP differs from P && E
- **Discharge call assumptions** — `forall M, Pre_M => WP[Body_M,Post_M]`
  - falsifier: exhibit method M and input satisfying Pre_M but not WP[Body_M,Post_M]

Breaker: Subsection 2.8.0 shows why crash-freedom tests must use WP rather than SP alone; Subsection 2.8.2 requires every assumed callee postcondition to be proved at its implementation.
Implementer: Conjoin assertion conditions into backward obligations, while using assumptions only where another verified component supplies the fact.

### §2.9 — Weakest Liberal Preconditions
`algebraic-laws, termination, wp-sp-calculus`

Error states:
- WLP is used alone, so an execution that crashes at assert false is ignored and the program is declared correct.
- A proof assumes WP == WLP even though the statement may crash.
- A proposed SP/WLP pair violates the Galois connection or its distribution laws.
- WP is treated as an upper adjoint satisfying WP[S,true] == true, which fails for assert false.

Laws:
- **Conservative-precondition decomposition** — `WP[S,Q] == WLP[S,Q] && WP[S,true]`
  - falsifier: exhibit S,Q,state s where the two sides have different truth values
- **SP-WLP Galois connection** — `Valid(SP[S,P] => Q) iff Valid(P => WLP[S,Q])`
  - falsifier: exhibit S,P,Q for which exactly one implication is valid
- **Adjoint distribution** — `SP[S,OR_i(P_i)] == OR_i(SP[S,P_i]) and WLP[S,AND_i(Q_i)] == AND_i(WLP[S,Q_i])`
  - falsifier: exhibit S and a predicate family for which either distribution equality fails
- **Empty-family identities** — `SP[S,false] == false and WLP[S,true] == true`
  - falsifier: exhibit S and state accepted by SP[S,false], or rejected by WLP[S,true]
- **WP is not the WLP upper adjoint** — `WP[assert false,true] == false`
  - falsifier: exhibit a state accepted by a candidate WP for assert false with postcondition true

Breaker: Subsections 2.9.0-2.9.2 separate postcondition reasoning from crash freedom and provide adjunction and distribution checks for semantic transformers.
Implementer: When using WLP, conjoin the independent no-crash obligation WP[S,true]; do not transfer WLP's upper-adjoint identities to WP.

### §2.10 — Method Calls with Preconditions
`abstraction-modules, assertions, contracts, proof-mechanics, wp-sp-calculus`

Error states:
- A caller invokes M(E) with P(E) false.
- A caller assumes the postcondition R(E,y') even when the precondition was never established.
- The proof checks Q for one allowed output instead of every y' satisfying R(E,y').
- A non-fresh formal name captures a caller variable and changes the substituted precondition or postcondition.

Laws:
- **Complete call weakest precondition** — `WP[t := M(E),Q] == P[x := E] && forall y', R[x,y := E,y'] => Q[t := y']; P and R are the callee precondition and postcondition`
  - falsifier: exhibit E and state where P[x := E] is false, or exhibit y' with R[x,y := E,y'] && !Q[t := y'], while a candidate precondition accepts
- **Fresh-input precondition equivalence** — `WP[x' := E; assert P[x := x'],Q] == WP[assert P[x := E],Q], when x' is fresh and absent from E and Q`
  - falsifier: exhibit E,P,Q and fresh x' for which the two weakest preconditions differ

Breaker: Attack both conjuncts of the call equation: illegal actual inputs and allowed outputs that defeat the caller's continuation.
Implementer: Use the Subsection 2.10 desugaring: fresh parameters, assign actual inputs, assert the precondition, assume the postcondition, then assign actual outputs.

### §2.11 — Function Calls
`algebraic-laws, proof-mechanics, wp-sp-calculus`

Error states:
- A proof treats transparent Abs as an arbitrary result and cannot establish its non-negativity.
- Abs returns a negative result on some input because its conditional definition is unfolded or implemented incorrectly.
- A conditional expression is simplified using only one branch, producing a false result for inputs selecting the other branch.

Laws:
- **Transparent function unfolding** — `f(E) == Body_f[x := E]; Body_f is the defining expression of f`
  - falsifier: exhibit function f and argument E with f(E) != Body_f[x := E]
- **Absolute-value definition** — `Abs(x) == (if x < 0 then -x else x) and forall x, Abs(x) >= 0`
  - falsifier: exhibit x with Abs(x) != (if x < 0 then -x else x), or Abs(x) < 0
- **Abs assertion discharge** — `WP[assert 0 <= Abs(E),Q] == Q for integer expression E`
  - falsifier: exhibit integer E and state where the computed weakest precondition differs from Q

Breaker: Use the function body itself as the oracle and split conditional expressions over both guards.
Implementer: Unfold transparent definitions, distribute surrounding operators across the conditional, and simplify each guarded branch.

### §2.12 — Partial Expressions
`arrays-search, assertions, contracts, proof-mechanics, wp-sp-calculus` · structures: arrays

Error states:
- Division evaluates with denominator zero.
- An array access uses i < 0 or i >= a.Length.
- MinusOne(y) is called with y <= 0, violating its function precondition.
- A short-circuit operator evaluates or demands definedness of a right operand that its left operand makes unreachable.
- An if-then-else expression demands definedness of the unselected branch or fails to demand it for the selected branch.

Laws:
- **Assignment definedness** — `WP[x := E,Q] == Defined(E) && Q[x := E]`
  - falsifier: exhibit state s with !Defined(E)(s) that a candidate weakest precondition accepts
- **Primitive domain guards** — `Defined(c/d) iff d != 0; Defined(a[i]) iff 0 <= i < a.Length; Defined(MinusOne(y)) iff y > 0`
  - falsifier: exhibit a zero denominator, out-of-range index, or nonpositive MinusOne argument that is classified as defined
- **Short-circuit definedness** — `Defined(E && F) == Defined(E) && (E => Defined(F)); Defined(E || F) == Defined(E) && (E || Defined(F)); Defined(E => F) == Defined(E) && (E => Defined(F))`
  - falsifier: exhibit E,F where a candidate rule requires F on a short-circuited path or omits it on an evaluated path
- **Conditional-expression definedness** — `Defined(if B then E else F) == Defined(B) && (if B then Defined(E) else Defined(F))`
  - falsifier: exhibit B,E,F where the selected branch is undefined but the expression is accepted, or only the unselected branch is undefined and it is rejected

Breaker: Convert every partial operation into an explicit assertion and test short-circuit and branch-sensitive definedness separately.
Implementer: Precede partial operations conceptually with their domain obligations, then propagate those obligations through WP using evaluation order.

### §2.13 — Method Correctness
`contracts, proof-mechanics, wp-sp-calculus`

Error states:
- The method precondition holds for an input, but the body fails to establish the postcondition.
- The body establishes the postcondition only for a subset of legal inputs.
- The body reaches a correct-looking result on normal runs but can crash or diverge from a state satisfying the precondition.

Laws:
- **Method implementation correctness** — `forall s, P(s) => WP[Body,Q](s); P is the method precondition and Q its postcondition`
  - falsifier: exhibit state s with P(s) && !WP[Body,Q](s)

Breaker: The tight refutation is a legal initial state outside the body's weakest precondition for the promised result.
Implementer: Compute WP of the complete body against the postcondition, including crash and termination obligations, then prove the declared precondition implies it.

### §2.N — Notes: Law of the Excluded Miracle
`algebraic-laws, background, specification-design, wp-sp-calculus`

Error states:
- Executable statement semantics claims to guarantee the impossible postcondition false from a real initial state.
- An implementation inserts assume false and uses the resulting absence of executions as proof of arbitrary behavior.

Laws:
- **Law of the Excluded Miracle** — `forall executable statements S, WP[S,false] == false`
  - falsifier: exhibit executable statement S and state s with WP[S,false](s)
- **Assume is a partial specification command** — `WP[assume false,false] == true`
  - falsifier: exhibit a state where WP[assume false,false] evaluates to false

Breaker: Reject miraculous executable implementations; the Notes explicitly identify assume as a specification-level partial command that violates the executable law.
Implementer: Keep assumption constructs in the reasoning layer and ensure executable code cannot establish correctness merely by eliminating all executions.

### §3.0 — The Endless Problem
`contracts, assertions, wp-sp-calculus, termination` · structures: recursive call stacks, nondeterministic recursive search

Error states:
- BadDouble recurses forever, so its ensures clause is never realized by a returned result.
- PartialId called with odd x recurses with the same x, so the call stack grows without bound although y == x would hold if it returned.
- Squarish can keep changing guess forever, so x*x == y is not guaranteed to be reached.
- Impossible makes an immediate self-call with no base case, so no result can satisfy its postcondition.
- Admitting Dubious makes a == 1 + a and therefore proves 0 == 1, making the logic inconsistent.

Laws:
- **total correctness combines value correctness and termination** — `TotalCorrect(S,Q) = PartialCorrect(S,Q) && Terminates(S) (S = program; Q = postcondition)`
  - falsifier: exhibit S,Q with PartialCorrect(S,Q) = true and Terminates(S) = false
- **recursive definitions must not imply arithmetic contradiction** — `Dubious() = 1 + Dubious() => 0 = 1 (Dubious() = recursive integer function result)`
  - falsifier: exhibit an admitted function f with f() = 1 + f()

Breaker: Reject any implementation that satisfies its postcondition only conditionally on termination, and reject recursive definitions that make false assertions derivable.
Implementer: Prove total correctness: establish the postcondition and supply a well-founded decrease for every recursive path before treating the result as meaningful.

### §3.1 — Avoiding Infinite Recursion
`termination, proof-mechanics` · structures: recursive activation-record trees, seq<int>

Error states:
- A recursive call keeps the same or increases its termination metric, so the verifier cannot rule out infinite recursion.
- Using -lo as a metric permits an unbounded descending chain outside the nonnegative integers, so decrease alone does not establish termination.
- SeqSum uses a metric that does not decrease when lo advances, leaving its recursive call unjustified.

Laws:
- **every recursive call strictly decreases a nonnegative metric** — `forall call c -> d: mu(c) >= 0 && mu(d) < mu(c) (mu = decreases expression; c,d = caller and callee activations; < = termination-order decrease)`
  - falsifier: exhibit a recursive call c -> d with mu(c) < 0 or mu(d) >= mu(c)
- **SeqSum interval distance decreases** — `hi - (lo + 1) < hi - lo (lo,hi = SeqSum bounds; lo < hi)`
  - falsifier: exhibit lo,hi with lo < hi but hi - (lo + 1) >= hi - lo

Breaker: Make every recursive edge expose a strictly smaller nonnegative metric; specifically test the interval-distance decrease used by SeqSum.
Implementer: Choose a progress measure that counts remaining work, such as hi - lo, and check the caller-to-callee obligation on every branch.

### §3.2 — Well-Founded Relations
`termination, algebraic-laws, proof-mechanics` · structures: termination-metric values, bool, int, real, set<T>, seq<T>, and inductive-datatype values

Error states:
- A proposed reduction relation relates a value to itself, allowing a self-recursive call to appear decreasing.
- A proposed relation is nontransitive, so two locally decreasing calls do not compose into a valid descent argument.
- A real-valued order based on ordinary strict less-than admits an infinite descending sequence such as 1, 1/2, 1/3, ... .
- An integer metric is treated as decreasing below a negative caller value, even though Dafny's integer reduction relation requires a nonnegative caller.

Laws:
- **well-founded reduction is irreflexive** — `not (a >_wf a) (a = any metric value; >_wf = chosen well-founded reduction relation)`
  - falsifier: exhibit a with a >_wf a
- **well-founded reduction is transitive** — `(a >_wf b && b >_wf c) => a >_wf c (a,b,c = metric values)`
  - falsifier: exhibit a,b,c with a >_wf b && b >_wf c && not (a >_wf c)
- **well-founded reduction has no infinite descending chain** — `not exists a[0],a[1],... such that forall i >= 0, a[i] >_wf a[i+1] (a[i] = metric values)`
  - falsifier: exhibit an infinite sequence a[0],a[1],... with a[i] >_wf a[i+1] for every i
- **Dafny integer reduction** — `X >_wf y iff (y < X && 0 <= X) (X,y = int metrics; >_wf = Dafny's integer reduction relation)`
  - falsifier: exhibit X,y:int for which exactly one of X >_wf y and (y < X && 0 <= X) holds

Breaker: Test the chosen metric relation itself for irreflexivity, transitivity, and absence of infinite descent before testing program-specific decreases clauses.
Implementer: Use Dafny's built-in well-founded order for the metric type and remember that an integer caller must be nonnegative; arbitrary real strict descent is not sufficient.

### §3.3 — Lexicographic Tuples
`termination, algebraic-laws, proof-mechanics` · structures: lexicographic tuples, mutually recursive call graphs, nested recursive calls

Error states:
- A checker accepts a transition from (2,100) to (3,0) because a later component decreased even though the earlier component increased.
- A checker rejects a valid proper-prefix descent, such as StudyPlan's one-component metric to Learn's two-component metric.
- ExpLess1 and ExpLess2 recurse with the same n, so decreases n alone cannot prove the call from ExpLess1(n) to ExpLess2(n).

Laws:
- **lexicographic comparison prioritizes earlier components** — `(a,b) >_lex (a2,b2) iff a >_wf a2 || (a = a2 && b >_wf b2) (a,b,a2,b2 = tuple components; >_lex = lexicographic reduction; >_wf = component reduction)`
  - falsifier: exhibit a,a2,b,b2 with not (a >_wf a2) && b >_wf b2 && (a,b) >_lex (a2,b2)
- **a proper prefix reduces to the longer tuple** — `properPrefix(p,q) => p >_lex q (p,q = bounded tuples; >_lex = lexicographic reduction)`
  - falsifier: exhibit p,q with properPrefix(p,q) && not (p >_lex q)
- **function rank breaks equal-argument mutual recursion** — `(n,1) >_lex (n,0) && (n,0) >_lex (n - 1,1) for n >= 1 (n = shared argument; tuple = decreases metric)`
  - falsifier: exhibit n >= 1 with not ((n,1) >_lex (n,0)) or not ((n,0) >_lex (n - 1,1))

Breaker: Apply the tuple laws across Sections 3.3.0–3.3.3: remaining school work, Ackermann, mutual recursion, and the ExpLess refactoring.
Implementer: Put the dominant progress measure first, use the proper-prefix rule when crossing outer and inner computations, and add a constant rank when mutually recursive functions pass equal arguments.

### §3.4 — Default decreases in Dafny
`termination, specification-design, proof-mechanics` · structures: function and method parameter tuples, recursive call graphs

Error states:
- SeqSum relies on the default tuple (s,lo,hi), but its recursive call increases lo rather than decreasing that tuple, so termination is unproved.
- StudyPlan relies on the default metric n, but Learn can call StudyPlan(n + 1), so the guessed metric does not descend.
- An explicit metric is removed without checking the verifier's new guess, leaving a recursive edge whose guessed metric is not smaller.

Laws:
- **a default metric is valid only when every call decreases it** — `Verified(f) => forall call c -> d: default_mu(c) >_wf default_mu(d) (Verified = termination check succeeds; default_mu = verifier's guessed decreases metric)`
  - falsifier: exhibit f and call c -> d with default_mu(c) <=_wf default_mu(d)
- **nondefault progress measures must be stated explicitly** — `SeqSum_mu(s,lo,hi) = hi - lo && StudyPlan_mu(n) = 40 - n (s = sequence; lo,hi = bounds; n = completed-course count)`
  - falsifier: exhibit a SeqSum call where the default tuple fails to reduce even though hi - lo decreases, or a StudyPlan call where n fails to reduce even though 40 - n decreases

Breaker: Break any implementation that treats a verifier guess as a theorem when the signature tuple does not represent remaining work.
Implementer: Inspect the default metric, retain it only when every recursive edge decreases, and write an explicit clause such as hi - lo or 40 - n when the signature order is wrong.

### §3.5 — Summary
`termination, proof-mechanics` · structures: recursive and mutually recursive call graphs, lexicographic decreases tuples

Error states:
- A decreases list is interpreted as unrelated component checks rather than one lexicographic metric, so a valid dominant-component descent is rejected or an invalid later-component descent is accepted.
- A recursive branch has no strict decrease in the chosen well-founded order, so the program can continue forever despite correct local result equations.

Laws:
- **a decreases list denotes one lexicographic tuple** — `decreases E1,...,Ek = tuple(E1,...,Ek) under >_lex (Ei = listed expressions; >_lex = lexicographic order)`
  - falsifier: exhibit two recursive calls whose acceptance differs between tuple lexicographic comparison and independent component comparison
- **every recursive edge descends** — `forall recursive calls c -> d: mu(c) >_lex mu(d) (mu = decreases tuple; >_lex = fixed well-founded lexicographic order)`
  - falsifier: exhibit a recursive call c -> d with not (mu(c) >_lex mu(d))

Breaker: Use the summary as the global gate: a recursive implementation is acceptable only when its decreases tuple descends on every edge.
Implementer: Expose the metric as a lexicographic tuple and prove each branch's caller-to-callee comparison; omit explicit clauses only when the default guess passes that test.

### §4.0 — Blue-Yellow Trees
`inductive-data, algebraic-laws, specification-design` · structures: BYTree binary trees, BlueLeaf, YellowLeaf, and Node constructors

Error states:
- A value outside BlueLeaf, YellowLeaf, or Node is accepted as a BYTree.
- Node is constructed with the wrong arity or with a child that is not itself a BYTree.
- Code assumes every BYTree is a leaf and mishandles a legal Node value.

Laws:
- **BYTree values are exhausted by their constructors** — `t in BYTree => (t = BlueLeaf || t = YellowLeaf || exists l,r: t = Node(l,r)) (t = any BYTree value; l,r = BYTree subtrees)`
  - falsifier: exhibit t in BYTree with t != BlueLeaf && t != YellowLeaf && not (exists l,r: t = Node(l,r))

Breaker: Use the datatype declaration as an exhaustive shape contract for every tree value and constructor use.
Implementer: Define the three variants first, then handle each constructor explicitly; treat the recursive Node parameters as BYTree values.

### §4.1 — Matching on Datatypes
`inductive-data, algebraic-laws, proof-mechanics` · structures: BYTree binary trees, constructor-pattern matches

Error states:
- A match on BYTree omits a legal variant such as YellowLeaf, so a valid input has no defined branch.
- BlueCount returns the wrong result for a leaf because BlueLeaf and YellowLeaf branches are confused.
- BlueCount(Node(left,right)) counts only one subtree or binds the child patterns incorrectly, so blue leaves are lost.

Laws:
- **BlueCount follows all BYTree constructors** — `BlueCount(BlueLeaf) = 1 && BlueCount(YellowLeaf) = 0 && BlueCount(Node(l,r)) = BlueCount(l) + BlueCount(r) (BlueCount = blue-leaf count; l,r = subtrees)`
  - falsifier: exhibit a BYTree t with BlueCount(t) != the corresponding constructor equation
- **match cases are exhaustive for the source datatype** — `covered(match,BYTree) = {BlueLeaf,YellowLeaf,Node} (covered = constructor cases supplied by match)`
  - falsifier: exhibit a BYTree match with covered(match,BYTree) missing one of BlueLeaf, YellowLeaf, or Node

Breaker: Turn each constructor branch into a red case and include the recursive sum law for Node.
Implementer: Write an exhaustive match, bind each constructor parameter in scope, and reduce recursive branches to the corresponding subtrees.

### §4.2 — Discriminators and Destructors
`inductive-data, contracts, algebraic-laws` · structures: BYTree binary trees, Node.left and Node.right destructors

Error states:
- The Node discriminator reports true for a leaf or false for a Node.
- A destructor such as t.left is evaluated on a leaf, violating its Node precondition.
- A destructor returns the wrong child, so Node(l,r).left or Node(l,r).right is not the original subtree.

Laws:
- **the discriminator agrees with the constructor variant** — `IsNode(t) = t.Node? (IsNode = predicate defined by a match; Node? = built-in Node discriminator)`
  - falsifier: exhibit t with IsNode(t) != t.Node?
- **destructors recover Node parameters** — `t = Node(l,r) => t.Node? && t.left = l && t.right = r (l,r = original subtrees; left,right = destructors)`
  - falsifier: exhibit l,r with Node(l,r).left != l or Node(l,r).right != r
- **destructor definedness is its discriminator precondition** — `defined(t.left) = t.Node? (defined = the destructor precondition holds)`
  - falsifier: exhibit a leaf t with defined(t.left) = true

Breaker: Check both the variant test and the guarded field projection; a destructor must never be used outside its constructor case.
Implementer: Use a match or discriminator before accessing a destructor, and let the discriminator/destructor equations recover the original Node children.

### §4.3 — Structural Inclusion
`inductive-data, termination, algebraic-laws, proof-mechanics` · structures: recursive inductive trees, constructor-child structural relation

Error states:
- A recursive tree function calls itself on a value that is not a structurally included child, so termination cannot be established.
- A recursive call chain cycles through equal or larger datatype values, so the function can recurse forever.

Laws:
- **constructor children are structurally smaller** — `Node(t,u) >_wf t && Node(t,u) >_wf u (>_wf = structural-inclusion reduction; t,u = BYTree values)`
  - falsifier: exhibit t,u with not (Node(t,u) >_wf t) or not (Node(t,u) >_wf u)
- **structural inclusion has no infinite descent** — `not exists a[0],a[1],... such that forall i >= 0, a[i] >_wf a[i+1] (a[i] = inductive-datatype values; >_wf = structural inclusion)`
  - falsifier: exhibit an infinite sequence of inductive-datatype values with a[i] >_wf a[i+1] for every i

Breaker: Require every recursive call on a datatype to move to an actual constructor parameter, not merely to a value that looks smaller.
Implementer: Use the datatype argument as the decreases value; pattern matching exposes the structurally included children and Dafny can discharge the decrease.

### §4.4 — Enumerations
`inductive-data, algebraic-laws, specification-design` · structures: ColoredTree, Color enumeration

Error states:
- A color outside Blue, Yellow, Green, or Red is accepted as a Color.
- IsSwedishFlagColor classifies Green or Red as Swedish-flag colors, or rejects Blue or Yellow.
- IsLithuanianFlagColor accepts Blue or rejects a non-Blue color.

Laws:
- **Color is an exhaustive finite enumeration** — `c in Color iff (c = Blue || c = Yellow || c = Green || c = Red) (c = color value)`
  - falsifier: exhibit c in Color with c != Blue && c != Yellow && c != Green && c != Red
- **Swedish flag colors are exactly blue and yellow** — `IsSwedishFlagColor(c) = (c = Blue || c = Yellow) (c = Color value)`
  - falsifier: exhibit c with IsSwedishFlagColor(c) != (c = Blue || c = Yellow)
- **Lithuanian flag colors are every non-blue color** — `IsLithuanianFlagColor(c) = (c != Blue) (c = Color value)`
  - falsifier: exhibit c with IsLithuanianFlagColor(c) != (c != Blue)

Breaker: Use the finite constructor set to test both enum exhaustiveness and color predicates.
Implementer: Represent each color as a parameterless constructor and dispatch predicates directly from the finite set of variants.

### §4.5 — Type Parameters
`inductive-data, algebraic-laws, specification-design` · structures: generic Tree<T> binary trees, leaf payloads of type T

Error states:
- Tree<int> accepts a Leaf carrying a string or another payload of the wrong type.
- Size returns a value other than 1 for a leaf or drops one subtree at a Node.
- AllBlue accepts a non-blue Color leaf or returns true when either child subtree is not all blue.

Laws:
- **generic Tree preserves its payload type** — `Tree<T> = Leaf(T) | Node(Tree<T>,Tree<T>) (T = payload type; | = constructor alternatives)`
  - falsifier: exhibit a value v with v in Tree<T> and v = Leaf(x) where x is not of type T
- **Size counts one leaf and both subtrees** — `Size(Leaf(x)) = 1 && Size(Node(l,r)) = Size(l) + Size(r) (x = payload; l,r = Tree<T> subtrees)`
  - falsifier: exhibit x,l,r with Size(Leaf(x)) != 1 or Size(Node(l,r)) != Size(l) + Size(r)
- **AllBlue is structural over Tree<Color>** — `AllBlue(Leaf(c)) = (c = Blue) && AllBlue(Node(l,r)) = (AllBlue(l) && AllBlue(r)) (c = Color payload; l,r = Tree<Color> subtrees)`
  - falsifier: exhibit c,l,r with either AllBlue(Leaf(c)) != (c = Blue) or AllBlue(Node(l,r)) != (AllBlue(l) && AllBlue(r))

Breaker: Test the generic shape independently of the payload type, then test recursive functions for preserving every leaf and subtree.
Implementer: Parameterize both the datatype and reusable functions by T; pattern-match Leaf and Node and make recursive results combine over both children.

### §4.6 — Abstract Syntax Trees for Expressions
`inductive-data, algebraic-laws, termination, specification-design, proof-mechanics` · structures: Expr AST, Op enumeration, List<Expr>, map<string,nat> environments

Error states:
- Eval dispatches a legal Const, Var, or Node expression to the wrong case or drops a Node's argument list.
- Eval returns a nonzero value for an unmapped variable even though the specified default is zero.
- EvalList uses the wrong identity for an empty Add or Mul list, or combines the head and tail with the wrong operation.
- EvalList or Eval makes a recursive call on a non-structurally-smaller expression or list, allowing nontermination.

Laws:
- **literal evaluation is identity** — `Eval(Const(c),env) = c (c = literal nat; env = map<string,nat>)`
  - falsifier: exhibit c,env with Eval(Const(c),env) != c
- **missing variables evaluate to zero** — `Eval(Var(s),env) = if s in env.Keys then env[s] else 0 (s = variable name; env = environment map)`
  - falsifier: exhibit s,env with s not in env.Keys and Eval(Var(s),env) != 0
- **Node evaluation delegates to its argument list** — `Eval(Node(op,args),env) = EvalList(args,op,env) (op = Add or Mul; args = List<Expr>)`
  - falsifier: exhibit op,args,env with Eval(Node(op,args),env) != EvalList(args,op,env)
- **list evaluation uses operation identities and combines head with tail** — `EvalList(Nil,Add,env) = 0 && EvalList(Nil,Mul,env) = 1 && EvalList(Cons(e,tail),op,env) = combine(op,Eval(e,env),EvalList(tail,op,env)) (combine(Add,x,y) = x + y; combine(Mul,x,y) = x * y)`
  - falsifier: exhibit e,tail,op,env with any listed EvalList equation false
- **mutual recursion follows structural inclusion** — `Node(op,args) >_wf args && Cons(e,tail) >_wf e && Cons(e,tail) >_wf tail (>_wf = structural-inclusion reduction)`
  - falsifier: exhibit a recursive call whose caller and callee arguments do not satisfy one of these structural reductions

Breaker: Use the evaluator equations and structural decreases together: Sections 4.6's AST, list, operation, and environment cases are one mutually recursive contract.
Implementer: Pattern-match Expr and List, use zero and one as the Add and Mul identities, combine head and tail under the selected operation, and rely on structural arguments for termination.

### §4.7 — Summary
`inductive-data, algebraic-laws, termination, proof-mechanics` · structures: inductive datatypes, constructor-built trees

Error states:
- Two constructor applications with different payloads compare equal, so the payload cannot be recovered by deconstruction.
- A value with no declared constructor variant is admitted, so a supposedly exhaustive match can miss an input.
- A recursive proof treats a child as no smaller than its constructor-built parent, so structural termination is lost.
- An infinite or cyclic datatype value is admitted, defeating the finite-structure basis of induction and termination.

Laws:
- **constructors are injective** — `C(x1,...,xk) = C(y1,...,yk) => x1 = y1 && ... && xk = yk (C = any datatype constructor; xi,yi = constructor parameters)`
  - falsifier: exhibit C,x1,...,xk,y1,...,yk with C(x1,...,xk) = C(y1,...,yk) and some xi != yi
- **distinct constructors form distinct variants** — `C(...) != D(...) for C != D (C,D = distinct datatype constructors)`
  - falsifier: exhibit distinct constructors C,D and arguments with C(...) = D(...)
- **inductive structure is finite and well-founded** — `C(...,x,...) >_wf x && not exists a[0],a[1],... with forall i >= 0, a[i] >_wf a[i+1] (>_wf = structural inclusion)`
  - falsifier: exhibit a constructor value and child where not (C(...,x,...) >_wf x), or an infinite structural-descending chain

Breaker: Use constructor injectivity, variant separation, and finite structural descent as the chapter-wide datatype laws.
Implementer: Define values bottom-up, deconstruct only declared variants, and prove recursive datatype functions by reducing to structurally included parameters.

### §5.0 — Declaring a Lemma
`contracts, lemmas-proofs, specification-design`

Error states:
- the lemma specifies only x <= More(x), so an implementation returning More(x) == x satisfies the contract despite violating the intended strict growth
- the postcondition mentions the wrong argument, such as x < More(x + 1), so callers learn nothing about More(x)
- an intended input restriction is omitted from requires, so callers apply the lemma where its intended antecedent is false

Laws:
- **Increasing** — `forall x:int. x < More(x)`
  - falsifier: exhibit x:int with More(x) <= x
- **Lemma contract soundness** — `forall x. Pre(x) => Post(x), where Pre and Post are the declared precondition and postcondition; Pre(x)=true when no precondition is declared`
  - falsifier: exhibit x with Pre(x) && !Post(x)

Breaker: Treat the lemma declaration as the public law: make the domain explicit and state strict growth rather than a weaker approximation.
Implementer: Represent the property as a ghost method whose requires clause controls applicability and whose ensures clause states exactly what callers may assume.

### §5.1 — Using a Lemma
`contracts, assertions, lemmas-proofs, proof-mechanics`

Error states:
- the code invokes Increasing(a) but not Increasing(More(a)), so the final two-step-growth assertion lacks its middle link
- the code invokes Increasing on c == More(More(a)) instead of on b == More(a), proving a fact about the next value rather than the value used by the assertion
- Increasing(More(a)) is called only when a < 1000, but 2 <= More(More(a)) - a is asserted after the branches rejoin
- a lemma is instantiated with a value that differs from the expression occurring at the failing assertion

Laws:
- **Two-step strict growth** — `forall a:int. More(More(a)) >= a + 2`
  - falsifier: exhibit a:int with More(More(a)) < a + 2
- **All-path instance coverage** — `forall a,p. ReachFinal(p,a) => Have_p(a < More(a)) && Have_p(More(a) < More(More(a))), where Have_p(P) means P was established on path p`
  - falsifier: exhibit a and a path p reaching the final assertion with either growth fact missing

Breaker: Test the composed behavior, and require the two lemma instances on every path reaching the assertion; a true lemma called on the wrong value is irrelevant.
Implementer: Instantiate postconditions on the exact intermediate values used by the consumer. Lemma knowledge is path-sensitive even though lemma calls do not mutate state.

### §5.2 — Proving a Lemma
`contracts, termination, lemmas-proofs, proof-mechanics`

Error states:
- a body-less lemma is treated as an axiom, allowing callers to assume strict growth without any proof
- the proof handles x <= 0 but leaves the positive branch without the induction hypothesis, so the postcondition is not established on every return path
- the recursive proof calls Increasing(x), making no progress and attempting to justify the goal by an infinite circular call
- the proof recurses on x + 2 or another non-decreasing argument, so its termination argument is invalid

Laws:
- **More defining equation** — `forall x:int. More(x) = (if x <= 0 then 1 else More(x - 2) + 3)`
  - falsifier: exhibit x:int with More(x) != (if x <= 0 then 1 else More(x - 2) + 3)
- **Increasing theorem** — `forall x:int. x < More(x)`
  - falsifier: exhibit x:int with More(x) <= x
- **Induction descent** — `forall x:int. x > 0 => proofArg(x) = x - 2 && proofArg(x) < x, where proofArg is the argument of the recursive lemma call`
  - falsifier: exhibit x:int with x > 0 and proofArg(x) >= x

Breaker: Reject an unproved declaration as evidence and target both the theorem and the recursive proof's progress measure.
Implementer: Split on the same condition as More, discharge the base case by unfolding, and obtain the positive case from Increasing(x - 2). The decreasing recursive call is the induction argument.

### §5.3 — Back to Basics
`assertions, wp-sp-calculus, lemmas-proofs, proof-mechanics`

Error states:
- a proof assertion is false at a reachable program point even though earlier assertions were true
- the positive branch unfolds More but omits Increasing(x - 2), leaving no fact that bounds More(x - 2)
- two consecutive formulas are written down even though the first does not imply the second
- a previously established formula is omitted as redundant even though a variable occurring in it changed
- one branch establishes x < More(x), but the other reaches the join without establishing the postcondition

Laws:
- **Reachable assertion validity** — `forall proof points p and states s. Reach(p,s) => A_p(s), where A_p is the assertion at p`
  - falsifier: exhibit a reachable pair (p,s) with !A_p(s)
- **Base-case implication** — `forall x:int. x <= 0 && More(x) = 1 => x < More(x)`
  - falsifier: exhibit x:int with x <= 0 && More(x) = 1 && More(x) <= x
- **Inductive-step implication** — `forall x:int. x > 0 && More(x) = More(x - 2) + 3 && x - 2 < More(x - 2) => x < More(x)`
  - falsifier: exhibit x:int satisfying the three premises with More(x) <= x

Breaker: Section 5.3.0 turns the proof into local implications; Section 5.3.1 makes each implication independently checkable as an assertion. Ask for a reachable counterexample at the first invalid step.
Implementer: Lay out precondition, branch facts, unfolding equations, induction hypothesis, and postcondition as a Floyd-logic chain. Remove assertions only after confirming their facts remain available and their variables are unchanged.

### §5.4 — Proof Calculations
`assertions, lemmas-proofs, algebraic-laws, proof-mechanics`

Error states:
- a calc step uses == where only <= holds, silently strengthening an inequality into a false equality
- the step 3*x + 2*n <= 3*x + 3*n is used for an arbitrary integer n; it fails when n is negative
- successive comparison operators point in incompatible directions, so their endpoint relation does not follow by transitivity
- a checked hint calls a lemma on the wrong arguments and therefore does not establish the relation between its adjacent expressions

Laws:
- **Checked calc step** — `forall steps i. R_i(e_i,e_(i+1)) holds after executing hint_i, where e_i and e_(i+1) are adjacent expressions and R_i is the displayed operator`
  - falsifier: exhibit a step i and inputs with hint_i satisfied but !R_i(e_i,e_(i+1))
- **Compatible-chain endpoint** — `Compatible(R_0,...,R_(n-1)) && all i. R_i(e_i,e_(i+1)) => Chain(e_0,e_n), where Compatible means the operators compose in one direction and Chain is their transitive endpoint relation`
  - falsifier: exhibit a calculation whose displayed steps hold but whose claimed endpoint relation fails
- **Nonnegative arithmetic bound** — `forall x:int,n:nat. 3*x + n + n <= 3*(x + n)`
  - falsifier: exhibit x:int,n:nat with 3*x + n + n > 3*(x + n)

Breaker: Make every displayed transformation separately falsifiable, including its domain assumptions and relation direction. Section 5.4.0 requires hints to prove the adjacent step rather than merely state something true.
Implementer: Start from the more structured side, choose ==, <=, >=, or implication according to the information actually available, and put required lemma calls inside the corresponding checked hint.

### §5.5 — Example: Reduce
`termination, lemmas-proofs, algebraic-laws, proof-mechanics`

Error states:
- Reduce returns a value greater than x, violating the upper bound despite its recursive subtraction
- Reduce returns exactly x - 2*m, satisfying the stated non-strict lower bound but violating the stronger strict bound established by the calculation
- the proof replaces 2*(m/2) by m for odd m, using a false integer-division equality
- the recursive call keeps m unchanged or increases it, so the reduction and its inductive proof may not terminate
- the recursive case increments x or subtracts m incorrectly, violating the defining recurrence

Laws:
- **Reduce defining equation** — `forall m:nat,x:int. Reduce(m,x) = (if m = 0 then x else Reduce(floor(m/2),x + 1) - m)`
  - falsifier: exhibit m:nat,x:int with Reduce(m,x) != (if m = 0 then x else Reduce(floor(m/2),x + 1) - m)
- **Reduce bounds** — `forall m:nat,x:int. x - 2*m < Reduce(m,x) && Reduce(m,x) <= x`
  - falsifier: exhibit m:nat,x:int with Reduce(m,x) <= x - 2*m || Reduce(m,x) > x
- **Halving arithmetic and descent** — `forall m:nat. 2*floor(m/2) = m - (m % 2) && 2*floor(m/2) <= m && (m > 0 => floor(m/2) < m)`
  - falsifier: exhibit m:nat where a halving equality or inequality fails, or m > 0 with floor(m/2) >= m

Breaker: Sections 5.5.0 and 5.5.1 supply a two-sided oracle for Reduce; odd m is the sharp counterexample class for the tempting but false doubling-after-halving equality.
Implementer: Split on m = 0, unfold Reduce, invoke the bound on floor(m/2), and continue with an inequality rather than equality. Use floor(m/2) < m as the induction discharge.

### §5.6 — Example: Commutativity of Multiplication
`termination, lemmas-proofs, algebraic-laws, proof-mechanics`

Error states:
- repeated-addition multiplication depends on argument order, yielding Mult(x,y) != Mult(y,x)
- the x = 0 case returns a nonzero result because recursion in y is mishandled
- the proof calls MultCommutative(y - 1,x - 1) under decreases (x,y) when y - 1 can exceed x, so the recursive call is not lexicographically smaller
- a recursive call subtracts 1 from a natural argument without first establishing that the argument is positive

Laws:
- **Repeated-addition definition** — `forall x,y:nat. Mult(x,y) = (if y = 0 then 0 else x + Mult(x,y - 1))`
  - falsifier: exhibit x,y:nat with Mult(x,y) != (if y = 0 then 0 else x + Mult(x,y - 1))
- **Multiplication commutativity** — `forall x,y:nat. Mult(x,y) = Mult(y,x)`
  - falsifier: exhibit x,y:nat with Mult(x,y) != Mult(y,x)
- **Lexicographic proof descent** — `lex((a,b),(x,y)) := a < x || (a = x && b < y); forall x,y:nat. (y > 0 => lex((x,y - 1),(x,y))) && (y < x => lex((y,x),(x,y))) && (x > 0 && y > 0 => lex((x - 1,y - 1),(x,y)) && lex((x - 1,y),(x,y)))`
  - falsifier: exhibit x,y:nat and one listed branch condition whose recursive argument is not lexicographically smaller than (x,y)

Breaker: Test commutativity asymmetrically, especially at zero and with x far smaller than y, and audit every proposed induction call against the declared ordering.
Implementer: Partition the input space into cases that make each recursive call legal. When swapping decremented arguments would break the default ordering, call the symmetric lemma instance whose first component actually decreases.

### §5.7 — Example: Mirroring a Tree
`inductive-data, lemmas-proofs, algebraic-laws, proof-mechanics` · structures: binary trees Tree<T> with Leaf and Node constructors

Error states:
- Mirror swaps only the root children and leaves descendants unmirrored; a shallow double swap may pass involution while the Node defining equation fails
- Mirror changes a leaf payload instead of returning the same leaf
- Mirror drops or duplicates a subtree, so applying it twice does not reconstruct the original tree
- Mirror loses or duplicates leaves, so Size(Mirror(t)) differs from Size(t)

Laws:
- **Structural mirror equations** — `forall d,l,r. Mirror(Leaf(d)) = Leaf(d) && Mirror(Node(l,r)) = Node(Mirror(r),Mirror(l))`
  - falsifier: exhibit a payload d or subtrees l,r for which either constructor equation fails
- **Mirror involution** — `forall t:Tree<T>. Mirror(Mirror(t)) = t`
  - falsifier: exhibit t:Tree<T> with Mirror(Mirror(t)) != t
- **Leaf-count preservation** — `forall t:Tree<T>. Size(Mirror(t)) = Size(t), where Size(Leaf(d))=1 and Size(Node(l,r))=Size(l)+Size(r)`
  - falsifier: exhibit t:Tree<T> with Size(Mirror(t)) != Size(t)

Breaker: Sections 5.7.0 and 5.7.1 give independent structural, involution, and leaf-count checks; retain the structural equation because involution alone admits unintended transformations.
Implementer: Match on the tree constructor, unfold until recursive subtrees are exposed, invoke the induction hypothesis on both subtrees, then rebuild the target. Section 5.7.2 warns that a valid intermediate equality is not necessarily the stated goal.

### §5.8 — Example: Working on Abstract Syntax Trees
`inductive-data, lemmas-proofs, algebraic-laws, specification-design, proof-mechanics` · structures: expression ASTs Expr with Const, Var, and Node constructors, linked lists of expressions List<Expr>, finite maps from strings to natural numbers used as environments

Error states:
- Substitute replaces the wrong variable name or misses a nested occurrence, so evaluation no longer agrees with updating the environment
- SubstituteList handles the head but skips the tail, so substitution correctness fails for a later list element
- Unit(Mul) is defined as 0 or Unit(Add) as 1, causing optimization to remove a non-unit expression and change evaluation
- Shorten returns the wrong constant for an empty argument list or mishandles a singleton list, changing the Node's value
- OptimizeAndFilter drops a non-unit optimized argument, so Optimize changes the expression's value under some environment

Laws:
- **Substitution semantics** — `forall e,n,c,env. Eval(Substitute(e,n,c),env) = Eval(e,update(env,n,c)), where update(env,n,c) maps n to c and agrees with env elsewhere`
  - falsifier: exhibit e,n,c,env with Eval(Substitute(e,n,c),env) != Eval(e,update(env,n,c))
- **List substitution semantics** — `forall args,op,n,c,env. EvalList(SubstituteList(args,n,c),op,env) = EvalList(args,op,update(env,n,c))`
  - falsifier: exhibit args,op,n,c,env where the two EvalList results differ
- **Operator units** — `Unit(Add) = 0 && Unit(Mul) = 1`
  - falsifier: exhibit op in {Add,Mul} with Unit(op) different from its stated value
- **Shorten semantic equivalence** — `forall op,args,env. Eval(Shorten(op,args),env) = Eval(Node(op,args),env)`
  - falsifier: exhibit op,args,env with Eval(Shorten(op,args),env) != Eval(Node(op,args),env)
- **Optimize-and-filter semantic equivalence** — `forall args,op,env. Eval(Node(op,OptimizeAndFilter(args,Unit(op))),env) = Eval(Node(op,args),env)`
  - falsifier: exhibit args,op,env where optimizing and filtering the arguments changes the Node evaluation
- **Optimization semantic preservation** — `forall e,env. Eval(Optimize(e),env) = Eval(e,env)`
  - falsifier: exhibit e,env with Eval(Optimize(e),env) != Eval(e,env)

Breaker: Section 5.8.0 requires substitution tests across every AST constructor and list position. Section 5.8.1 requires semantic equivalence for Add and Mul, with empty, singleton, unit-containing, and nested argument lists.
Implementer: Mirror the mutually recursive evaluators and transformations with mutually recursive lemmas. Prove the Shorten and OptimizeAndFilter helper contracts, then compose them in OptimizeCorrect; structure each proof by the same constructor cases as its function.

### §6.0 — List Definition
`inductive-data, background` · structures: List<T> with Nil and Cons(head,tail)

Error states:
- A constructor admits mixed element types — `Cons(true, Cons(3, Nil))` is accepted as a `List`.
- A `Nil` is treated as a `Cons`, so `head(Nil)` or `tail(Nil)` is read instead of being rejected.
- A `Cons(x,xs)` exposes the wrong head or tail — `head(Cons(x,xs)) != x` or `tail(Cons(x,xs)) != xs`.

Laws:
- **List constructor coverage** — `For every v:List<T>, isNil(v) == true || isCons(v) == true`
  - falsifier: exhibit v:List<T> with isNil(v) == false and isCons(v) == false
- **Cons destructor laws** — `head(Cons(x,xs)) == x && tail(Cons(x,xs)) == xs`
  - falsifier: exhibit x,xs with head(Cons(x,xs)) != x or tail(Cons(x,xs)) != xs
- **Homogeneous list typing** — `type(Cons(x,xs)) == List<T> iff type(x) == T && type(xs) == List<T>`
  - falsifier: exhibit x=true,y=3 with Cons(x,Cons(y,Nil)) accepted as one typed List

Breaker: Check that every list has exactly the Nil-or-Cons shape, destructors expose the constructor fields, and element types remain homogeneous.
Implementer: Represent lists with only Nil and Cons, pattern-match before destructing, and preserve one element type T throughout.

### §6.1 — Length
`inductive-data, algebraic-laws, lemmas-proofs` · structures: List<T>

Error states:
- The empty list is miscounted — `Length(Nil) != 0`.
- A nonempty list loses the head from its count — `Length(Cons(x,xs)) != 1 + Length(xs)`.
- Appending an element with `Snoc` does not increase length by one — `Length(Snoc(xs,x)) != Length(xs) + 1`.

Laws:
- **Empty length** — `Length(Nil) == 0`
  - falsifier: exhibit the empty list with Length(Nil) != 0
- **Cons length recursion** — `Length(Cons(x,xs)) == 1 + Length(xs)`
  - falsifier: exhibit x,xs with Length(Cons(x,xs)) != 1 + Length(xs)
- **Snoc length** — `Length(Snoc(xs,x)) == Length(xs) + 1`
  - falsifier: exhibit xs,x with Length(Snoc(xs,x)) != Length(xs) + 1

Breaker: Use the zero-case and one-step recursion equations as the basic count oracle for every list operation.
Implementer: Match on the list; return zero for Nil and one plus the recursive tail length for Cons, then discharge Snoc by induction.

### §6.2 — Intrinsic versus Extrinsic Specifications
`specification-design, algebraic-laws, lemmas-proofs` · structures: List<T>

Error states:
- Append drops or duplicates elements — `Length(Append(xs,ys)) != Length(xs) + Length(ys)`.
- Appending `Nil` changes a list — `Append(xs,Nil) != xs` or `Append(Nil,xs) != xs`.
- Grouping concatenations changes the result — `Append(Append(xs,ys),zs) != Append(xs,Append(ys,zs))`.
- Snoc is not append of a singleton — `Snoc(xs,x) != Append(xs,Cons(x,Nil))`.

Laws:
- **Append length** — `For xs,ys:List<T>, Length(Append(xs,ys)) == Length(xs) + Length(ys)`
  - falsifier: exhibit xs,ys with Length(Append(xs,ys)) != Length(xs) + Length(ys)
- **Append units** — `Append(Nil,xs) == xs && Append(xs,Nil) == xs`
  - falsifier: exhibit xs with either Append(Nil,xs) != xs or Append(xs,Nil) != xs
- **Append associativity** — `Append(Append(xs,ys),zs) == Append(xs,Append(ys,zs))`
  - falsifier: exhibit xs,ys,zs with the two parenthesizations unequal
- **Snoc as singleton append** — `Snoc(xs,x) == Append(xs,Cons(x,Nil))`
  - falsifier: exhibit xs,x with Snoc(xs,x) != Append(xs,Cons(x,Nil))

Breaker: Use the unit and associativity laws from subsection 6.2.0, together with length and the Snoc singleton law, to detect malformed concatenation.
Implementer: Make universally useful facts such as Append length intrinsic; prove multi-call algebraic facts extrinsically by induction, especially the first-list argument, as advised in subsection 6.2.0.

### §6.3 — Take and Drop
`contracts, inductive-data, algebraic-laws, lemmas-proofs` · structures: List<T>

Error states:
- A strict Take or Drop call is accepted with `n > Length(xs)`, so the body reaches `head` or `tail` on a Nil value.
- Take returns a non-prefix or the wrong prefix — `Take(xs,n)` is not the first n elements of xs.
- Drop returns a non-suffix or the wrong suffix — `Drop(xs,n)` does not start after the first n elements.
- Splitting and recombining loses or reorders data — `Append(Take(xs,n),Drop(xs,n)) != xs`.

Laws:
- **Strict domain** — `defined(Take(xs,n)) && defined(Drop(xs,n)) => n <= Length(xs)`
  - falsifier: exhibit xs=Nil,n=1 with a strict Take or Drop call accepted
- **Take-drop recombination** — `n <= Length(xs) => Append(Take(xs,n),Drop(xs,n)) == xs`
  - falsifier: exhibit xs,n with n <= Length(xs) and recombination unequal to xs
- **Take-drop over append** — `Take(Append(xs,ys),Length(xs)) == xs && Drop(Append(xs,ys),Length(xs)) == ys`
  - falsifier: exhibit xs,ys where either extracted part differs

Breaker: Test the strict precondition and the split/recombine laws; these expose both off-by-one errors and element loss.
Implementer: Use the precondition to justify `head` and `tail`, recurse on `n-1`, and prove recombination by induction; the liberal variants must agree whenever `n <= Length(xs)`.

### §6.4 — At
`contracts, inductive-data, algebraic-laws, lemmas-proofs` · structures: List<T> with zero-based indices

Error states:
- At accepts an improper index — `At(xs,Length(xs))` is defined or reads from Nil.
- At returns the wrong element at a valid index — `At(xs,i) != the element after i predecessors`.
- Dropping a valid index produces Nil or a wrong head — `Drop(xs,i).Cons?` is false or `head(Drop(xs,i)) != At(xs,i)`.
- At over Append chooses the wrong list or uses the wrong offset.

Laws:
- **At domain** — `defined(At(xs,i)) => i < Length(xs)`
  - falsifier: exhibit xs,i with i >= Length(xs) and At(xs,i) accepted
- **At after Drop** — `i < Length(xs) => Drop(xs,i).Cons? && At(xs,i) == head(Drop(xs,i))`
  - falsifier: exhibit xs,i with i < Length(xs) and either conjunct false
- **At over Append** — `i < Length(Append(xs,ys)) => At(Append(xs,ys),i) == if i < Length(xs) then At(xs,i) else At(ys,i-Length(xs))`
  - falsifier: exhibit xs,ys,i in range where the selected value or offset is wrong

Breaker: Treat proper indexing and the At/Drop/Append correspondence as one contract: every At call must have a proven index and correct branch offset.
Implementer: Carry length facts into the recursive call; establish `Drop(xs,i).Cons?` before reading its head, and split AtAppend at `Length(xs)`.

### §6.5 — Find
`arrays-search, contracts, inductive-data, algebraic-laws` · structures: List<T(==)> with zero-based search indices

Error states:
- Find returns a position outside the list — `Find(xs,y) > Length(xs)`.
- Find returns a later occurrence instead of the first — `Find(Cons(y,Cons(y,Nil)),y) != 0`.
- Find reports a hit at an index whose element is not y — `Find(xs,y) < Length(xs)` but `At(xs,Find(xs,y)) != y`.
- An earlier position already contains y — `i < Find(xs,y)` but `At(xs,i) == y`.
- Appending or dropping a prefix gives the wrong absolute index.

Laws:
- **Find range** — `0 <= Find(xs,y) && Find(xs,y) <= Length(xs)`
  - falsifier: exhibit xs,y with Find(xs,y) < 0 or Find(xs,y) > Length(xs)
- **Find hit-or-absence** — `Find(xs,y) == Length(xs) || At(xs,Find(xs,y)) == y`
  - falsifier: exhibit xs,y with Find(xs,y) < Length(xs) and At(xs,Find(xs,y)) != y
- **First occurrence** — `i < Find(xs,y) => At(xs,i) != y`
  - falsifier: exhibit xs,y,i with i < Find(xs,y) and At(xs,i) == y
- **Find over Append** — `Find(xs,y) == Length(xs) || Find(Append(xs,ys),y) == Find(xs,y)`
  - falsifier: exhibit xs,ys,y with y present in xs and the appended search index changed
- **Find after Drop** — `i <= Find(xs,y) => Find(xs,y) == Find(Drop(xs,i),y) + i`
  - falsifier: exhibit xs,y,i satisfying the premise with unequal absolute indices

Breaker: The red tests should distinguish first hit, absence sentinel, and index translation across Append and Drop.
Implementer: Match on the head first, recurse only after proving the equality-characteristic is available, and use the range contract to justify every At call.

### §6.6 — List Reversal
`inductive-data, algebraic-laws, lemmas-proofs, wp-sp-calculus, proof-mechanics` · structures: List<T>, ReverseAux accumulator list

Error states:
- Reverse changes the multiset or order of elements — it is not the mathematical reverse of the input.
- ReverseAux loses or duplicates the accumulator — its result is not the reversed input followed by acc.
- The efficient Reverse disagrees with the reference SlowReverse.
- Reversing an Append uses the wrong order, or Reverse is not an involution.

Laws:
- **Reverse preserves length** — `Length(Reverse(xs)) == Length(xs)`
  - falsifier: exhibit xs with unequal input and output lengths
- **Reference correctness** — `Reverse(xs) == SlowReverse(xs)`
  - falsifier: exhibit xs where the efficient and slow reversals differ
- **Accumulator correctness** — `ReverseAux(xs,acc) == Append(Reverse(xs),acc)`
  - falsifier: exhibit xs,acc where ReverseAux(xs,acc) differs from reversed xs followed by acc
- **Reverse of Append** — `Reverse(Append(xs,ys)) == Append(Reverse(ys),Reverse(xs))`
  - falsifier: exhibit xs,ys violating the reversed concatenation order
- **Reverse involution** — `Reverse(Reverse(xs)) == xs`
  - falsifier: exhibit xs with Reverse(Reverse(xs)) != xs

Breaker: Use the reference implementation, accumulator equation, length, reverse-of-Append, and involution as mutually reinforcing witnesses against loss or order errors.
Implementer: Introduce the accumulator invariant `ReverseAux(xs,acc) == Append(reverse(xs),acc)`; in the Cons case normalize with SnocAppend and Append associativity before applying the induction hypothesis.

### §6.7 — Lemmas in Expressions
`assertions, wp-sp-calculus, proof-mechanics, lemmas-proofs, termination` · structures: List<T>, ReverseAux/ReverseAuxHelper recursion, At indices

Error states:
- A proof-authoring statement changes the expression's result — `value(S;E) != value(E)`.
- An At call is accepted without proving its index proper, for example `Length(xs)-1-i >= Length(Reverse(xs))`.
- ReverseAux returns a value that violates its intrinsic postcondition after the Cons branch.
- Mutual recursion between ReverseAux and ReverseAuxHelper fails to decrease, permitting an infinite call chain.
- AtReverse is stated with an undefined At expression because the reversed-list length fact is unavailable.

Laws:
- **Proof-expression erasure** — `For verified proof statement S and expression E, value(S;E) == value(E)`
  - falsifier: exhibit verified S,E with value(S;E) != value(E)
- **Intrinsic ReverseAux contract** — `ReverseAux(xs,acc) == Append(SlowReverse(xs),acc)`
  - falsifier: exhibit xs,acc for which the function result violates its postcondition
- **AtReverse well-definedness** — `i < Length(xs) => Length(xs)-1-i < Length(Reverse(xs))`
  - falsifier: exhibit xs,i satisfying i < Length(xs) but the reversed index is out of range
- **AtReverse symmetry** — `i < Length(xs) => At(xs,i) == At(Reverse(xs),Length(xs)-1-i)`
  - falsifier: exhibit xs,i in range with unequal mirrored elements
- **Helper decreases** — `lexrank(tail,Cons(x,acc),0) < lexrank(Cons(x,tail),acc)`
  - falsifier: exhibit x,tail,acc where the helper call's Dafny decreases tuple is not smaller

Breaker: Check that proof statements are semantically erased, every expression precondition is discharged, and the AtReverse symmetry is backed by a valid reversed index.
Implementer: Place assertions, calculations, or lemma calls before the expression they justify; subsection 6.7.0 supplies the intrinsic-helper pattern, while 6.7.1 supplies the repeated LengthReverse and case-split move.

### §6.8 — Eliding Type Arguments
`background, specification-design` · structures: Generic List<T> signatures

Error states:
- An elided `List` is instantiated with a type other than the enclosing type parameter, so a generic call accepts or returns the wrong element type.
- T is elided from a signature even though it appears only in the result, so `At` loses its result type and admits incompatible clients.
- Explicit and elided signatures expose different type parameters, so a call type-checks in one form but not the other.

Laws:
- **Enclosing-parameter List elision** — `Inside a declaration with enclosing type parameter T, List == List<T> and List<T> == List<T>`
  - falsifier: exhibit a generic declaration where elided List is inferred as a type other than List<T>
- **Signature-preserving elision** — `Length<T>(xs:List<T>):nat == Length(xs:List):nat`
  - falsifier: exhibit a call accepted by one Length signature but rejected or differently typed by the other
- **Result-type parameter cannot be elided** — `resultType(At<T>(xs:List<T>,i:nat):T) == T, so T remains explicit`
  - falsifier: exhibit T1 != T2 where an elided At signature gives both List<T1> and List<T2> the same result type

Breaker: Treat elision as a typing equivalence, not a change in the generic interface; especially preserve T when it appears in At's result.
Implementer: Use elided List and type parameters only when the enclosing declaration determines them; retain explicit T for result types, as in At.

### §7.0 — Basic Definitions
`inductive-data, algebraic-laws, lemmas-proofs, background` · structures: Unary = Zero | Suc(pred), nat

Error states:
- UnaryToNat miscounts a successor — `UnaryToNat(Suc(x)) != 1 + UnaryToNat(x)`.
- NatToUnary maps a positive natural to Zero or to the wrong successor chain.
- The two conversions are not inverses — `UnaryToNat(NatToUnary(n)) != n` or `NatToUnary(UnaryToNat(x)) != x`.

Laws:
- **UnaryToNat constructors** — `UnaryToNat(Zero) == 0 && UnaryToNat(Suc(x)) == 1 + UnaryToNat(x)`
  - falsifier: exhibit x with either constructor equation false
- **NatToUnary constructors** — `NatToUnary(0) == Zero && NatToUnary(n+1) == Suc(NatToUnary(n)) for n:nat`
  - falsifier: exhibit n:nat where either constructor equation false
- **Unary-to-nat round trip** — `UnaryToNat(NatToUnary(n)) == n`
  - falsifier: exhibit n:nat with a changed round trip
- **Nat-to-unary round trip** — `NatToUnary(UnaryToNat(x)) == x`
  - falsifier: exhibit x:Unary with a changed round trip

Breaker: Use both conversion directions as a finite, structural oracle for the Zero/Suc representation and its arithmetic meaning.
Implementer: Define each conversion by its constructor cases and prove the two round trips by induction; do not make later Unary proofs depend on conversion alone.

### §7.1 — Comparisons
`inductive-data, algebraic-laws, lemmas-proofs, specification-design` · structures: Unary

Error states:
- Less accepts Zero as the right operand — `Less(x,Zero) == true`.
- Less is reflexive or off by one — `Less(x,x) == true` or `Less(Suc(x),x) == true`.
- The relation is nontransitive — `Less(x,y) && Less(y,z)` holds while `Less(x,z)` does not.
- Less fails trichotomy, or Below is not total and antisymmetric.

Laws:
- **Structural Less definition** — `Less(x,y) == (y != Zero && (x.Suc? ==> Less(x.pred,y.pred)))`
  - falsifier: exhibit x,y where the predicate differs from its Zero/Suc definition
- **Less correctness** — `Less(x,y) <==> UnaryToNat(x) < UnaryToNat(y)`
  - falsifier: exhibit x,y where Less and the natural-number comparison disagree
- **Less transitivity** — `Less(x,y) && Less(y,z) ==> Less(x,z)`
  - falsifier: exhibit x,y,z satisfying the two premises but not the conclusion
- **Less trichotomy** — `exactly_one(Less(x,y), x == y, Less(y,x))`
  - falsifier: exhibit x,y with none or more than one of the three propositions true
- **Below total order** — `Below(x,y) == (Less(x,y) || x == y), with Below(x,y) || Below(y,x) and (Below(x,y) && Below(y,x) ==> x == y)`
  - falsifier: exhibit x,y violating totality or antisymmetry

Breaker: Break the comparison at Zero/Suc boundaries, then test natural correspondence, transitivity, trichotomy, and the derived total order.
Implementer: Prove transitivity by assuming its antecedent, splitting on `x.Suc?`, and recursing on predecessors; the implication form supports both forward and reverse use.

### §7.2 — Addition and Subtraction
`inductive-data, contracts, algebraic-laws, lemmas-proofs` · structures: Unary

Error states:
- Add miscounts successors — `UnaryToNat(Add(x,y)) != UnaryToNat(x) + UnaryToNat(y)`.
- Addition depends on operand order or parenthesization.
- Suc or Zero fails to act as the stated successor or unit.
- Sub accepts `x < y`, or valid subtraction fails to reconstruct the minuend — `Add(Sub(x,y),y) != x`.

Laws:
- **Add correctness** — `UnaryToNat(Add(x,y)) == UnaryToNat(x) + UnaryToNat(y)`
  - falsifier: exhibit x,y where the Unary and nat sums disagree
- **Add units** — `Add(x,Zero) == x && Add(Zero,x) == x`
  - falsifier: exhibit x violating either unit equation
- **Suc distribution** — `Suc(Add(x,y)) == Add(Suc(x),y)`
  - falsifier: exhibit x,y violating successor distribution
- **Add associativity** — `Add(Add(x,y),z) == Add(x,Add(y,z))`
  - falsifier: exhibit x,y,z with unequal parenthesizations
- **Add commutativity** — `Add(x,y) == Add(y,x)`
  - falsifier: exhibit x,y with unequal operand order results
- **Sub correctness** — `!Less(x,y) => UnaryToNat(Sub(x,y)) == UnaryToNat(x) - UnaryToNat(y)`
  - falsifier: exhibit x,y satisfying !Less(x,y) with an incorrect difference
- **Add after Sub** — `!Less(x,y) => Add(Sub(x,y),y) == x`
  - falsifier: exhibit x,y satisfying !Less(x,y) with failed reconstruction

Breaker: Use correspondence plus unit, successor, associativity, commutativity, and valid-subtraction reconstruction to catch arithmetic and boundary defects.
Implementer: Follow the definition's chosen induction parameter; prove the opposite-sided unit/distribution laws as helper lemmas, and guard Sub with `!Less(x,y)`.

### §7.3 — Multiplication
`inductive-data, algebraic-laws, lemmas-proofs` · structures: Unary

Error states:
- Multiplication by Zero is not Zero — `Mul(Zero,y) != Zero`.
- The successor case does not add one copy of y — `Mul(Suc(x),y) != Add(Mul(x,y),y)`.
- The result does not correspond to natural multiplication.

Laws:
- **Mul base case** — `Mul(Zero,y) == Zero`
  - falsifier: exhibit y with Mul(Zero,y) != Zero
- **Mul successor recursion** — `Mul(Suc(x),y) == Add(Mul(x,y),y)`
  - falsifier: exhibit x,y violating the repeated-addition step
- **Mul correctness** — `UnaryToNat(Mul(x,y)) == UnaryToNat(x) * UnaryToNat(y)`
  - falsifier: exhibit x,y where the Unary product and nat product disagree

Breaker: Check the Zero base, repeated-addition recurrence, and natural-number product correspondence.
Implementer: Induct on x, unfold Mul in the successor case, and use AddCorrect to normalize the recursive result.

### §7.4 — Division and Modulus
`termination, contracts, algebraic-laws, lemmas-proofs, proof-mechanics, inductive-data` · structures: Unary, Pair `(Unary,Unary)` containing quotient and remainder

Error states:
- A zero divisor is accepted — `DivMod(x,Zero)` is defined despite the required precondition.
- The else-branch recursive call does not decrease, causing nontermination.
- Pair destructuring swaps quotient and remainder, or increments the wrong component.
- The quotient and remainder fail reconstruction — `Add(Mul(d,y),m) != x`.
- The remainder is not smaller than the divisor — `Less(m,y) == false`.

Laws:
- **Nonzero divisor domain** — `defined(DivMod(x,y)) => y != Zero`
  - falsifier: exhibit x with DivMod(x,Zero) accepted
- **Subtraction decreases the rank** — `!Less(x,y) && y != Zero => UnaryToNat(Sub(x,y)) < UnaryToNat(x)`
  - falsifier: exhibit x,y satisfying the premise with Sub(x,y) not smaller
- **DivMod base case** — `Less(x,y) && y != Zero => DivMod(x,y) == (Zero,x)`
  - falsifier: exhibit x,y satisfying the premise with a different pair
- **DivMod recursive step** — `!Less(x,y) && y != Zero && DivMod(Sub(x,y),y) == (d',m') => DivMod(x,y) == (Suc(d'),m')`
  - falsifier: exhibit x,y,d',m' satisfying the premise but not the quotient/remainder step
- **Pair pattern binding** — `For r == (d0,m0), let (d,m) := r implies d == d0 && m == m0`
  - falsifier: exhibit a pair whose pattern binding changes or swaps a component
- **Division-modulus correctness** — `For (d,m) == DivMod(x,y), y != Zero => Add(Mul(d,y),m) == x && Less(m,y)`
  - falsifier: exhibit x,y with y != Zero violating reconstruction or the remainder bound

Breaker: Red tests must cover the nonzero-divisor contract, decreasing subtraction, pair component order, reconstruction, and the strict remainder bound.
Implementer: Use SubCorrect before the recursive call with the natural decreases metric in 7.4.0, or structural inclusion from 7.4.1; use pair patterns from 7.4.2 and prove the two correctness clauses by cases as in 7.4.3.

### §8.0 — Specification
`specification-design, algebraic-laws, inductive-data, lemmas-proofs` · structures: integer lists, multisets, keyed record lists

Error states:
- the sorting function returns exactly the input elements but in non-ascending order
- the sorting function returns an ordered list that drops a duplicate or introduces an element
- the Ordered predicate checks only the first adjacent pair and accepts a later inversion
- a keyed sort reorders distinct records with equal keys, so sortedness and multiset preservation hold but stability fails

Laws:
- **Ordered output** — `For every input list xs: Ordered(S(xs)), where S is the candidate sorting function and Ordered is the ascending adjacent-pair predicate.`
  - falsifier: exhibit xs with !Ordered(S(xs))
- **Global meaning of Ordered** — `For every integer list xs and natural indices i,j: Ordered(xs) && i <= j && j < Length(xs) => At(xs,i) <= At(xs,j), where At(xs,k) is zero-based lookup.`
  - falsifier: exhibit xs,i,j with Ordered(xs), i <= j < Length(xs), and At(xs,i) > At(xs,j)
- **Same-element multiplicities** — `For every input xs and integer p: Count(S(xs),p) = Count(xs,p), where Count(xs,p) is the number of occurrences of p.`
  - falsifier: exhibit xs,p with Count(S(xs),p) != Count(xs,p)
- **Stable projection** — `For every input xs and key p: ProjectKey(S(xs),p) = ProjectKey(xs,p), where ProjectKey retains, in order, exactly the records whose key is p; for integer lists this is Project(xs,p).`
  - falsifier: exhibit xs,p with ProjectKey(S(xs),p) != ProjectKey(xs,p)

Breaker: Section 8.0 makes sorting a conjunction: test order, multiplicity, and, when records have keys, equal-key order. Subsection 8.0.0 also warrants testing that the recursive Ordered definition implies order between arbitrary positions.
Implementer: Define specification-only predicates first, then prove their expected meaning. Use the recursive AllOrdered proof from 8.0.0: reduce both indices through the tail, and combine adjacent order with the induction hypothesis when the first index is zero.

### §8.1 — Insertion Sort
`specification-design, algebraic-laws, inductive-data, lemmas-proofs` · structures: integer lists

Error states:
- Insert places y after an element larger than y, so an ordered input produces an unordered output
- Insert drops y, duplicates y, or loses an existing element while still producing an ordered list
- InsertionSort sorts the tail but fails to insert the original head, so the result is not a rearrangement of the input
- the helper lemma claims Insert always returns an ordered list without requiring its input list to be ordered

Laws:
- **Insert preserves order** — `For every integer y and list xs: Ordered(xs) => Ordered(Insert(y,xs)).`
  - falsifier: exhibit y,xs with Ordered(xs) and !Ordered(Insert(y,xs))
- **Insert preserves projected elements** — `For every y,xs,p: Project(Cons(y,xs),p) = Project(Insert(y,xs),p), where Project retains all occurrences equal to p in list order.`
  - falsifier: exhibit y,xs,p with Project(Cons(y,xs),p) != Project(Insert(y,xs),p)
- **Insertion Sort is ordered** — `For every list xs: Ordered(InsertionSort(xs)).`
  - falsifier: exhibit xs with !Ordered(InsertionSort(xs))
- **Insertion Sort preserves projected elements** — `For every list xs and integer p: Project(xs,p) = Project(InsertionSort(xs),p).`
  - falsifier: exhibit xs,p with Project(xs,p) != Project(InsertionSort(xs),p)

Breaker: Test Insert independently because its two preservation laws are the tightest witnesses for the whole sort. Include an unordered xs against any over-strong InsertOrdered contract; the section explicitly discovers that Ordered(xs) is necessary.
Implementer: Mirror each recursive function with a lemma and follow the function's match and branch structure. Strengthen the helper lemma, not executable Insert, with Ordered(xs), then let the outer proof call the helper exactly where the algorithm calls Insert.

### §8.2 — Merge Sort
`specification-design, algebraic-laws, termination, inductive-data, lemmas-proofs` · structures: integer lists, prefix-suffix list pairs

Error states:
- Split returns halves with the requested lengths but drops, duplicates, or reorders an element, so Append(left,right) != xs
- one recursive MergeSortAux branch receives a length that is not strictly smaller than len, so recursion need not terminate
- Merge chooses the larger head first or otherwise creates an inversion even though both inputs are ordered
- Merge drops or duplicates occurrences, so its result is ordered but its projection differs from the appended input projections
- MergeSortAux returns an ordered list assembled from the halves but the final list does not contain exactly the original elements

Laws:
- **Split is an exact partition** — `For n <= Length(xs), let (left,right) = Split(xs,n): Length(left) = n && Length(right) = Length(xs) - n && Append(left,right) = xs.`
  - falsifier: exhibit xs,n,left,right with n <= Length(xs), (left,right) = Split(xs,n), and either Length(left) != n, Length(right) != Length(xs)-n, or Append(left,right) != xs
- **Both recursive lengths descend** — `For natural len with len >= 2: len/2 < len && len - len/2 < len, where / is natural-number division.`
  - falsifier: exhibit natural len >= 2 with len/2 >= len or len-len/2 >= len
- **Merge preserves order** — `For all lists xs,ys: Ordered(xs) && Ordered(ys) => Ordered(Merge(xs,ys)).`
  - falsifier: exhibit xs,ys with Ordered(xs), Ordered(ys), and !Ordered(Merge(xs,ys))
- **Merge preserves projected elements** — `For all ordered xs,ys and integer p: Project(Merge(xs,ys),p) = Append(Project(xs,p),Project(ys,p)).`
  - falsifier: exhibit ordered xs,ys and p with Project(Merge(xs,ys),p) != Append(Project(xs,p),Project(ys,p))
- **Merge Sort contract** — `For every xs,p: Ordered(MergeSort(xs)) && Project(MergeSort(xs),p) = Project(xs,p).`
  - falsifier: exhibit xs,p with !Ordered(MergeSort(xs)) or Project(MergeSort(xs),p) != Project(xs,p)

Breaker: Attack Split, Merge, and the two recursive sizes separately before testing the end-to-end sort; those laws pinpoint partition, merge, and termination faults. The same-elements test must preserve multiplicity, not merely set membership.
Implementer: Use len as the explicit decreases metric because the split prefix is not structurally known to be part of xs. For 8.2.2, calculate from the complex side, establish ordered inputs before invoking MergeSameElements, apply both induction hypotheses, distribute Project across Append, and finish with Append(left,right) = xs.

### §8.3 — Summary
`specification-design, algebraic-laws` · structures: lists, multisets, keyed record lists

Error states:
- a test suite accepts a sorter solely because its output is ordered, overlooking that elements were lost or invented
- a test suite accepts a sorter solely because it preserves the multiset, overlooking that the output remains unsorted
- a sorter of keyed records preserves keys and order by key but reverses records within an equal-key group

Laws:
- **Complete sorting specification** — `For every xs: Ordered(S(xs)) && Multiset(S(xs)) = Multiset(xs), where S is a sorting routine and Multiset records each element's multiplicity.`
  - falsifier: exhibit xs with !Ordered(S(xs)) or Multiset(S(xs)) != Multiset(xs)
- **Stable equal-key order** — `For every xs and key p: ProjectKey(S(xs),p) = ProjectKey(xs,p), where ProjectKey preserves the original sequence of records whose key is p.`
  - falsifier: exhibit xs,p with ProjectKey(S(xs),p) != ProjectKey(xs,p)

Breaker: Treat sortedness and same-elements as independent axes, and add the projection law when stability is promised. A green result on only one axis is not sorting correctness.
Implementer: Choose a specification form that exposes useful algebra: multiset or projection preservation avoids proving a complicated permutation relation and composes through recursive algorithms.

### §9.0 — Grouping Declarations into Modules
`abstraction-modules, algebraic-laws, background` · structures: modules, namespaces, lists

Error states:
- a qualified call intended for ListLibrary.Append resolves to another module's same-named Append, replacing list concatenation with an unrelated operation
- ListLibrary.Append violates associativity, so regrouping three concatenations changes the resulting list

Laws:
- **Qualified-name isolation** — `Resolve(M,n) = declaration M.n, where Resolve is qualified lookup; if modules M1 and M2 both declare n, Resolve(M1,n) and Resolve(M2,n) remain distinct declarations.`
  - falsifier: exhibit modules M1,M2 and name n with M1 != M2, both declaring n, but Resolve(M1,n) = Resolve(M2,n)
- **List append associativity** — `For all lists xs,ys,zs: Append(Append(xs,ys),zs) = Append(xs,Append(ys,zs)).`
  - falsifier: exhibit xs,ys,zs with Append(Append(xs,ys),zs) != Append(xs,Append(ys,zs))

Breaker: When modules contain same-named operations, write laws against the qualified declaration so a test cannot silently exercise the wrong function. Preserve the algebraic lemmas grouped with the datatype, such as AppendAssociative.
Implementer: Keep the datatype, its operations, and their lemmas in one module, and qualify external references through that module's name. This makes name resolution and proof dependencies explicit.

### §9.1 — Module Imports
`abstraction-modules, background` · structures: directed module-import graph

Error states:
- ModuleB refers to sibling ModuleA without importing it, leaving ModuleA unresolved in ModuleB
- import A = ModuleA binds A to the wrong module, so A.Plus computes a different operation than ModuleA.Plus
- the import graph contains ModuleA -> ModuleB -> ModuleA, violating the required module hierarchy

Laws:
- **No implicit sibling visibility** — `Sibling(A,B) && !Imports(B,A) => A notin Scope(B), where Scope(B) is the set of module names resolvable inside B.`
  - falsifier: exhibit sibling modules A,B with !Imports(B,A) but A in Scope(B)
- **Import alias binding** — `After import a = A inside B: ResolveB(a) = A, where ResolveB is module-name lookup in B.`
  - falsifier: exhibit modules A,B and alias a with import a = A in B but ResolveB(a) != A
- **Acyclic imports** — `For every module M: !ReachImportsPlus(M,M), where ReachImportsPlus is reachability by one or more import edges.`
  - falsifier: exhibit modules M0,...,Mk with k >= 1 and imports M0 -> M1 -> ... -> Mk -> M0

Breaker: Model imports as a directed graph and test both scope and acyclicity. Alias tests should identify the exact target module, not just establish that the alias resolves.
Implementer: Add every cross-module dependency through an explicit import and use a local alias when repeated qualification would obscure the proof. Keep the import relation hierarchical so modules cannot depend cyclically on one another.

### §9.2 — Export Sets
`abstraction-modules, specification-design, proof-mechanics` · structures: module export sets, Color datatype, Parity datatype

Error states:
- a declaration listed with provides leaks its body or datatype constructors, letting a client depend on a private representation
- an exported function signature mentions Parity while Parity is absent from the exported view, leaving the client interface malformed
- a revealed function body refers to hidden constructors Even or Odd, so the exported view contains unresolved names
- a wildcard export exposes a newly added helper, unexpectedly enlarging the public interface and allowing clients to couple to it

Laws:
- **Provides exports only the contract** — `Provides(M,d) => Exported(M,d) = Signature(d) && Body(d) notin ClientView(M), where Signature includes the name, types, parameters, and specification clauses.`
  - falsifier: exhibit module M and declaration d with Provides(M,d) but Body(d) or a hidden datatype constructor is in ClientView(M)
- **Reveals exports contract and definition** — `Reveals(M,d) => Exported(M,d) = Signature(d) + Body(d), where + denotes inclusion of both parts in the client view.`
  - falsifier: exhibit module M and declaration d with Reveals(M,d) but either Signature(d) or Body(d) absent from ClientView(M)
- **Export-view closure** — `Unresolved(ExportedView(M)) = {}, where Unresolved returns identifiers referenced by exported signatures or revealed bodies that are unavailable in the exported view.`
  - falsifier: exhibit module M with an exported signature or revealed body that references a name in Unresolved(ExportedView(M))
- **Private-addition stability** — `PublicNames(AddPrivateHelper(M,h)) = PublicNames(M), where h is not named by M's explicit export set.`
  - falsifier: exhibit module M and unlisted helper h whose addition changes PublicNames(M), as with an unintended wildcard export

Breaker: Inspect the exported projection as if all hidden declarations were deleted: it must still resolve and type-check. Also test opacity, because a client proof that succeeds only by unfolding a provided body has crossed the module boundary.
Implementer: Use provides for signatures and specifications, reveals only when clients should unfold the definition, and list public names explicitly. Close the surface over every type, constructor, or imported module mentioned by exported material.

### §9.3 — Modular Specification of a Queue
`contracts, specification-design, abstraction-modules, algebraic-laws, inductive-data, lemmas-proofs` · structures: immutable queues, singly linked lists, two-list queues with front and reversed rear

Error states:
- Empty maps to a nonempty abstract list, or another queue maps to the empty list while remaining unequal to Empty, making the Dequeue precondition unsound
- Enqueue inserts x at the head of the abstract sequence instead of the tail, turning FIFO behavior into the wrong order
- Dequeue returns the newest element from rear rather than the head element represented by the queue
- Dequeue returns the correct head but its remainder drops, duplicates, or reorders the remaining abstract elements
- the two-list implementation appends rear without reversing it, so Elements reports enqueued elements in reverse order

Laws:
- **Empty correctness and uniqueness** — `Elements(Empty()) = [] && (Elements(q) = [] => q = Empty()), where Elements maps a concrete queue to its abstract element list.`
  - falsifier: exhibit q with Elements(Empty()) != [] or with Elements(q) = [] and q != Empty()
- **Enqueue abstraction law** — `Elements(Enqueue(q,x)) = Snoc(Elements(q),x), where Snoc(xs,x) appends x to the end of xs.`
  - falsifier: exhibit q,x with Elements(Enqueue(q,x)) != Snoc(Elements(q),x)
- **Dequeue abstraction law** — `For q != Empty(), let (a,q2) = Dequeue(q): Cons(a,Elements(q2)) = Elements(q).`
  - falsifier: exhibit q,a,q2 with q != Empty(), (a,q2) = Dequeue(q), and Cons(a,Elements(q2)) != Elements(q)
- **Two-list representation mapping** — `Elements(FQ(front,rear)) = Append(front,Reverse(rear)), where FQ is the private two-list queue representation.`
  - falsifier: exhibit front,rear with Elements(FQ(front,rear)) != Append(front,Reverse(rear))

Breaker: Write tests against Elements, not hidden front/rear fields, and use the operation equations from 9.3.1 as the public oracle. Add the 9.3.3 empty-uniqueness case because abstract emptiness must justify the concrete q != Empty() precondition.
Implementer: Choose Elements first, state operation correctness as extrinsic lemmas, and export those lemmas with the opaque type and operations. For 9.3.4's two-list implementation, discharge every law through Elements(q) = front ++ Reverse(rear), proving only the empty representation canonical.

### §9.4 — Equality-Supporting Types
`contracts, specification-design, abstraction-modules, proof-mechanics` · structures: immutable queues, two-list queues, finite sets, possibly infinite sets, functions

Error states:
- compiled code compares possibly infinite sets or functions, requiring an equality computation that may not terminate or be computable
- the exported Queue<A> claims compiled equality for every A even though its stored lists require equality support from A
- IsEmpty returns false for Empty or true for a nonempty queue, so TryDequeue takes the wrong branch
- a client uses representation equality as abstract queue equality and reports two queues unequal even though they represent the same element list
- a compiled Length-based emptiness test disagrees with q == Empty(), permitting Dequeue on an abstractly empty queue or returning the default for a nonempty one

Laws:
- **Equality context boundary** — `EqAllowed(ghost,T) = true for every type T, and EqAllowed(compiled,T) = CompiledEq(T), where CompiledEq marks types with computable finite equality.`
  - falsifier: exhibit a compiled equality expression over type T with CompiledEq(T) = false that is nevertheless accepted
- **Queue equality support follows its element type** — `CompiledEq(Queue<A>) = CompiledEq(A) for the two-list Queue representation, because equality of both stored lists requires equality of A.`
  - falsifier: exhibit element type A with CompiledEq(A) = false but CompiledEq(Queue<A>) = true
- **Compiled emptiness agrees with Empty** — `For every q: IsEmpty(q) <=> q == Empty(), where IsEmpty is the exported compiled predicate and the equality in the contract is ghost equality.`
  - falsifier: exhibit q with IsEmpty(q) != (q == Empty())
- **Abstract queue equality** — `AbsEq(q1,q2) <=> Elements(q1) = Elements(q2), where AbsEq means equality of represented queue contents; concrete q1 == q2 is not a substitute except for the unique empty representation.`
  - falsifier: exhibit q1,q2 with Elements(q1) = Elements(q2) but a client-defined AbsEq based on q1 == q2 returns false
- **Length-based emptiness** — `For every q: Length(q) = 0 <=> q == Empty(), provided Length(q) = ListLength(Elements(q)) and Empty is the unique representation of the empty list.`
  - falsifier: exhibit q with Length(q) = 0 and q != Empty(), or Length(q) != 0 and q == Empty()

Breaker: Separate ghost equality from executable equality, and parameterize the latter by the element type's equality support. For queues, test the narrow compiled predicate from 9.4.2 rather than assuming concrete equality captures abstract contents.
Implementer: In 9.4.1, expose Queue(==)<A(==)> through an equality-supporting type synonym only when full compiled equality is intended. Otherwise follow 9.4.2: keep Queue opaque and export IsEmpty with IsEmpty(q) <=> q == Empty().

### §9.5 — Summary
`specification-design, abstraction-modules, algebraic-laws` · structures: module export sets, immutable queues, abstract element lists

Error states:
- a client proof unfolds a private queue representation, so replacing the two-list implementation breaks the client despite an unchanged public contract
- an operation changes concrete state without preserving its abstraction-function equation, so the client observes abstract behavior outside the specification
- an export uses provides where the client must unfold a definition, or reveals where the body was meant to remain a replaceable secret

Laws:
- **Representation-independent client proof** — `If implementations I1 and I2 have the same exported signatures, specifications, and revealed bodies, then ProvableClientFacts(C,I1) = ProvableClientFacts(C,I2) for every client C using only that exported view.`
  - falsifier: exhibit implementations I1,I2 with the same exported view and a client C whose proof succeeds for one only because it accesses an unexported representation detail
- **Abstraction-operation commutation** — `For each concrete operation opC there is an abstract operation opA such that Abs(opC(c,x)) = opA(Abs(c),x), where Abs is the module's abstraction function; EnqueueCorrect and DequeueCorrect instantiate this pattern.`
  - falsifier: exhibit concrete state c and input x with Abs(opC(c,x)) != opA(Abs(c),x)

Breaker: Demand both opacity and commutation: clients must not see the module's secret, and every exported operation must have the promised effect after abstraction. A body revealed unnecessarily weakens the representation-change test.
Implementer: Make the abstraction function the bridge between private data and public specifications. Export signatures with provides by default, reveal only definitions intentionally used in client reasoning, and prove each concrete operation commutes with its abstract counterpart.

### §10.0 — Priority-Queue Specification
`contracts, algebraic-laws, specification-design, abstraction-modules` · structures: PQueue (priority queue), multiset<int>

Error states:
- Empty returns a queue whose Elements value is not multiset{}
- IsEmpty(pq) disagrees with Elements(pq) == multiset{}
- Insert(pq,y) loses or duplicates an existing element — Elements(Insert(pq,y)) != Elements(pq) + multiset{y}
- RemoveMin returns y that is not minimal — IsMin(y, Elements(pq)) is false
- RemoveMin removes more or fewer than one occurrence — Elements(pq') + multiset{y} != Elements(pq)

Laws:
- **Empty abstraction** — `Elements(Empty()) == multiset{}`
  - falsifier: exhibit a queue pq with pq == Empty() and Elements(pq) != multiset{}
- **Emptiness characterization** — `IsEmpty(pq) <==> Elements(pq) == multiset{}, where pq:PQueue`
  - falsifier: exhibit pq with IsEmpty(pq) != (Elements(pq) == multiset{})
- **Insertion abstraction** — `Elements(Insert(pq,y)) == Elements(pq) + multiset{y}, where pq:PQueue and y:int`
  - falsifier: exhibit pq,y with Elements(Insert(pq,y)) != Elements(pq) + multiset{y}
- **Minimum-removal contract** — `!IsEmpty(pq) && RemoveMin(pq) == (y,pq') => IsMin(y, Elements(pq)) && Elements(pq') + multiset{y} == Elements(pq), where pq':PQueue`
  - falsifier: exhibit nonempty pq with RemoveMin(pq) == (y,pq') and either !IsMin(y, Elements(pq)) or Elements(pq') + multiset{y} != Elements(pq)
- **IsMin semantics** — `IsMin(y,s) <==> y in s && forall x, (x in s => y <= x), where s:multiset<int> and x,y:int`
  - falsifier: exhibit s,y with IsMin(y,s) true but some x in s has y > x

Breaker: Turn the abstract priority-queue contract into red tests for emptiness, insertion, and minimum removal, including both minimum selection and exact multiset conservation (10.0.0).
Implementer: Reason through Elements rather than a concrete representation, and keep the export boundary clear: clients use the provided operations and correctness lemmas while IsMin is the revealed helper (10.0.0-10.0.1).

### §10.1 — Designing the Data Structure
`inductive-data, representation-invariants, abstraction-modules, specification-design` · structures: PQueue, BraunTree (Leaf/Node), binary heap

Error states:
- A Leaf/Node-shaped tree violates heap order — a node value x is greater than a value in its subtree, although the skeleton type accepts it
- A tree violates Braun balance — for a Node, |Elements(left)| is neither |Elements(right)| nor |Elements(right)| + 1
- Insert or RemoveMin returns pq' with !Valid(pq'), so the next operation starts from a broken representation
- A correctness lemma is applied without Valid(pq), so it certifies an abstract result for a tree whose heap or balance assumptions do not hold

Laws:
- **Invariant decomposition** — `Valid(pq) <==> IsBinaryHeap(pq) && IsBalanced(pq), where pq:PQueue`
  - falsifier: exhibit pq with Valid(pq) true but either !IsBinaryHeap(pq) or !IsBalanced(pq)
- **Braun balance** — `IsBalanced(Node(x,left,right)) => (|Elements(left)| == |Elements(right)| || |Elements(left)| == |Elements(right)| + 1)`
  - falsifier: exhibit a purported balanced Node(x,left,right) with |Elements(left)| < |Elements(right)| or |Elements(left)| > |Elements(right)| + 1
- **Empty validity** — `Valid(Empty())`
  - falsifier: exhibit Empty() with !Valid(Empty())
- **Insert preserves validity** — `Valid(pq) => Valid(Insert(pq,y)), where pq:PQueue and y:int`
  - falsifier: exhibit valid pq,y with !Valid(Insert(pq,y))
- **RemoveMin preserves validity** — `Valid(pq) && !IsEmpty(pq) && RemoveMin(pq) == (y,pq') => Valid(pq'), where pq':PQueue`
  - falsifier: exhibit valid nonempty pq with RemoveMin(pq) == (y,pq') and !Valid(pq')

Breaker: Treat Valid as a gate, not as a comment: every produced tree must satisfy heap order and Braun balance, and every correctness claim must be conditional on it (10.1.0).
Implementer: Define the PQueue skeleton as Leaf/Node, then make Valid cover the non-skeletal constraints and carry it through Empty, Insert, and RemoveMin proofs.

### §10.2 — Implementation
`inductive-data, representation-invariants, algebraic-laws, lemmas-proofs, proof-mechanics` · structures: BraunTree (Leaf/Node), binary heap, PQueue, multiset<int>

Error states:
- Elements(Node(x,left,right)) omits or duplicates a payload — it does not equal multiset{x} + Elements(left) + Elements(right)
- Insert returns a tree with wrong abstract contents or violates the heap or Braun invariant
- RemoveMin returns the root but the returned value is not minimal — IsMin(y, Elements(pq)) is false
- DeleteMin leaves a result with the wrong multiset or with child sizes outside Braun balance
- ReplaceRoot fails to exchange exactly the old root for y, changing the multiset cardinality or element counts

Laws:
- **Structural Elements recursion** — `Elements(Leaf) == multiset{}; Elements(Node(x,left,right)) == multiset{x} + Elements(left) + Elements(right), where x:int and left,right:BraunTree`
  - falsifier: exhibit t with Elements(t) != the recursive union of every payload in t
- **Heap root is subtree minimum** — `IsBinaryHeap(Node(x,left,right)) && z in Elements(Node(x,left,right)) => x <= z, where z:int`
  - falsifier: exhibit t == Node(5,Node(3,Leaf,Leaf),Leaf) with IsBinaryHeap(t) true and 5 > 3
- **Insert correctness** — `Valid(pq) => Valid(Insert(pq,y)) && Elements(Insert(pq,y)) == Elements(pq) + multiset{y}, where y:int`
  - falsifier: exhibit valid pq,y with either !Valid(Insert(pq,y)) or Elements(Insert(pq,y)) != Elements(pq) + multiset{y}
- **DeleteMin removes exactly the root** — `Valid(pq) && pq != Leaf && DeleteMin(pq) == pq' => Valid(pq') && Elements(pq') + multiset{root(pq)} == Elements(pq) && |Elements(pq')| == |Elements(pq)| - 1, where root(Node(x,left,right)) == x`
  - falsifier: exhibit nonleaf valid pq with DeleteMin(pq) == pq' and either the multiset equality or size decrement false
- **ReplaceRoot exchange and size** — `Valid(pq) && pq != Leaf && ReplaceRoot(pq,y) == pq' => Valid(pq') && Elements(pq) + multiset{y} == Elements(pq') + multiset{root(pq)} && |Elements(pq')| == |Elements(pq)|`
  - falsifier: exhibit nonleaf valid pq,y with ReplaceRoot(pq,y) == pq' and an element exchange, validity, or size equality false
- **RemoveMin correctness** — `Valid(pq) && !IsEmpty(pq) && RemoveMin(pq) == (y,pq') => IsMin(y, Elements(pq)) && Valid(pq') && Elements(pq') + multiset{y} == Elements(pq)`
  - falsifier: exhibit valid nonempty pq with RemoveMin(pq) == (y,pq') and either y is not minimal, pq' is invalid, or the multiset conservation equality fails

Breaker: Target structural omissions, wrong promotion, size imbalance, and multiset rearrangement errors; the crucial oracles are Elements, root minimality, and exact one-element removal (10.2.0-10.2.5).
Implementer: Use structural induction for operations and lemmas; in multiset branches, name subexpressions, assert extensional equalities, and expose associativity and commutativity rearrangements in calc steps (10.2.4-10.2.5).

### §10.3 — Making Intrinsic from Extrinsic
`contracts, specification-design, abstraction-modules, representation-invariants, proof-mechanics` · structures: PQueue, BraunTree, PriorityQueue and PriorityQueueExtrinsic module layers

Error states:
- DeleteMin with only !IsEmpty as a precondition reaches pq.left.x when pq.left == Leaf — member access fails on a non-Braun tree
- RemoveMin does not propagate Valid to its call of optimized DeleteMin — an invalid or unbalanced tree reaches the optimized branch
- The intrinsic wrapper returns a result different from PriorityQueueExtrinsic for the same valid input
- The intrinsic wrapper advertises a postcondition that is false — for example, the result is not Valid or the removed value is not minimal

Laws:
- **Balanced-tree leaf implication** — `IsBalanced(Node(x,left,right)) && left == Leaf => right == Leaf`
  - falsifier: exhibit t == Node(x,Leaf,Node(z,Leaf,Leaf)) with IsBalanced(t) true
- **Optimized DeleteMin precondition** — `Valid(pq) && !IsEmpty(pq) => PreDeleteMin(pq), where PreDeleteMin(pq) := IsBalanced(pq) && !IsEmpty(pq)`
  - falsifier: exhibit pq with Valid(pq) && !IsEmpty(pq) but !PreDeleteMin(pq)
- **Intrinsic-extrinsic operation equivalence** — `PriorityQueue.Op(args) == PriorityQueueExtrinsic.Op(args) for each exported Op in {Empty, IsEmpty, Insert, RemoveMin}`
  - falsifier: exhibit valid args and an exported Op whose public result differs from the extrinsic result
- **Intrinsic RemoveMin postcondition** — `Valid(pq) && !IsEmpty(pq) && PriorityQueue.RemoveMin(pq) == (y,pq') => Valid(pq') && IsMin(y, Elements(pq)) && Elements(pq') + multiset{y} == Elements(pq)`
  - falsifier: exhibit valid nonempty pq with the public RemoveMin result violating validity, minimality, or conservation

Breaker: Add a red case for the optimized DeleteMin precondition: nonempty alone must not permit left.x access, and the strengthened Valid requirement must reach exported callers (10.3.0-10.3.1).
Implementer: Propagate the smallest invariant needed for safe code, then layer an intrinsically specified public module over the extrinsic implementation and discharge each wrapper contract by calling its proof lemma (10.3.1-10.3.2).

### §10.4 — Summary
`representation-invariants, abstraction-modules, specification-design, algebraic-laws` · structures: immutable priority queue, Braun tree, abstract data structure

Error states:
- An operation returns a skeleton that is not Valid even though its input is Valid — later clients inherit a broken heap or balance representation
- The Elements abstraction disagrees with an operation's concrete effect — clients observe the wrong contents
- Valid is true for a tree that fails the heap or balance property — a proof relies on an invariant fact that is not actually guaranteed
- A client obtains a PQueue skeleton outside the exported-operation closure and uses it as if it were valid, bypassing the module's invariant boundary

Laws:
- **Invariant entails representation facts** — `Valid(pq) => IsBinaryHeap(pq) && IsBalanced(pq), where pq:PQueue`
  - falsifier: exhibit pq with Valid(pq) true and either heap order or Braun balance false
- **Exported-operation closure** — `Valid(Empty()) && (Valid(pq) => Valid(Insert(pq,y))) && (Valid(pq) && !IsEmpty(pq) && RemoveMin(pq) == (y,pq') => Valid(pq'))`
  - falsifier: exhibit a value obtainable through the exported operations with !Valid(pq)
- **Abstract insertion effect** — `Elements(Insert(pq,y)) == Elements(pq) + multiset{y}`
  - falsifier: exhibit pq,y with the insertion equality false
- **Abstract minimum-removal effect** — `Valid(pq) && !IsEmpty(pq) && RemoveMin(pq) == (y,pq') => IsMin(y, Elements(pq)) && Elements(pq') + multiset{y} == Elements(pq)`
  - falsifier: exhibit valid nonempty pq with a nonminimal y or failed multiset conservation

Breaker: Use the summary as a closure test: Valid must imply the claimed representation facts, operations must preserve it, and Elements must describe their abstract effects.
Implementer: Choose an opaque Valid predicate plus an Elements abstraction, state them in preconditions and postconditions, and prove every invariant-derived property as a lemma from Valid (10.4).

### §11.0 — Loop Specifications
`contracts, assertions, specification-design, loops, mutation-frames`

Error states:
- loop is entered at x == 3 with invariant x % 2 == 0 — the entry obligation is false even if the guard is already false
- loop with guard i < 100 and invariant true exits at i == 101 — !guard holds but the claimed postcondition i == 100 does not
- quotient-modulus loop exits with 7*x + y == 191 but y < 0 — the relation holds while x == 191/7 and y == 191%7 fails
- square-root loop started with N == 104 but exits with r == 2 and N == 5 — the final bounds hold for a modified N, not the input

Laws:
- **loop-entry admissibility** — `Pre(s) => J(s), where s is the entry state and J is the loop invariant`
  - falsifier: exhibit s with Pre(s) && !J(s)
- **abstract loop exit** — `Run(s0) = s1 && J(s0) => J(s1) && !B(s1), where B is the guard`
  - falsifier: exhibit s0,s1 with Run(s0) = s1 && J(s0) && (!J(s1) || B(s1))
- **postcondition adequacy** — `forall s. J(s) && !B(s) => Q(s), where Q is the required postcondition`
  - falsifier: exhibit s with J(s) && !B(s) && !Q(s)
- **frame stability** — `v notin Frame(Run) => v(s1) = v(s0), where Run(s0) = s1`
  - falsifier: exhibit s0,s1,v with Run(s0) = s1 && v notin Frame(Run) && v(s1) != v(s0)

Breaker: Use the entry, exit, and post-adequacy obligations from 11.0.1 and 11.0.3; add an explicit stability test for every value that the result is meant to retain, as exposed by 11.0.5.
Implementer: Choose J so initialization proves it and J && !B proves the postcondition; relational invariants from 11.0.4 and a deliberate frame prevent correct-looking results about the wrong state.

### §11.1 — Loop Implementations
`contracts, wp-sp-calculus, specification-design, loops, mutation-frames, proof-mechanics`

Error states:
- quotient body changes x without the compensating change to y — 7*x + y is no longer 191 after one iteration
- two-step quotient update uses x' == x + 2 and y' == y - 14 when 7 <= y < 14 — the equation is preserved but y' becomes negative
- sum loop increments n but leaves s unchanged — at n == 1 and s == 0 it reaches n' == 2 and s' == 0 instead of s' == 1
- loop body accidentally assigns a, which was supposed to remain equal to input X — inferred framing no longer supports a == X

Laws:
- **invariant preservation** — `J(s) && B(s) && Body(s) = s' => J(s')`
  - falsifier: exhibit s,s' with J(s) && B(s) && Body(s) = s' && !J(s')
- **quotient-state preservation** — `0 <= y && 7*x + y == 191 && 7 <= y && Body(x,y) = (x',y') => 0 <= y' && 7*x' + y' == 191`
  - falsifier: exhibit x,y,x',y' satisfying the antecedent with y' < 0 || 7*x' + y' != 191
- **triangular-sum step** — `s = n*(n-1)/2 && n' = n+1 && s' = s+n => s' = n'*(n'-1)/2`
  - falsifier: exhibit n,s,n',s' satisfying the step premises with s' != n'*(n'-1)/2
- **inferred local frame** — `v notin Assigned(Body) && Body(s) = s' => v(s') = v(s)`
  - falsifier: exhibit Body,s,s',v with v notin Assigned(Body) && Body(s) = s' && v(s') != v(s)

Breaker: Test one body step from J && B, not a sampled number of repetitions (11.1.1). Include boundary states such as 7 <= y < 14 from 11.1.0 and stability checks derived from the assigned-variable set in 11.1.3.
Implementer: Work backward through assignments by substitution, and strengthen J when the one-step obligation needs a fact not already present. For derived accumulators, use the algebraic recurrence as in 11.1.2.

### §11.2 — Loop Termination
`termination, loops, proof-mechanics`

Error states:
- body does nothing — it preserves every invariant but leaves the termination metric unchanged and can loop forever
- quotient body updates x' == x - 1 and y' == y + 7 — 7*x + y is preserved while guard 7 <= y remains true forever
- chosen integer metric is negative at the back edge — ordinary decrease is not a well-founded termination argument
- default metric F - E for guard E < F stays constant or increases on a body branch — that branch has no proved progress

Laws:
- **integer ranking decrease** — `J(s) && B(s) && Body(s) = s' => D(s') < D(s) && 0 <= D(s), where D is the integer decreases expression`
  - falsifier: exhibit s,s' with J(s) && B(s) && Body(s) = s' && (D(s') >= D(s) || D(s) < 0)
- **eventual guard falsification** — `J(s[0]) && Body terminates && every guarded step satisfies D(s[k+1]) < D(s[k]) && 0 <= D(s[k]) => exists k >= 0. J(s[k]) && !B(s[k])`
  - falsifier: exhibit an infinite guarded execution satisfying J and all stated ranking premises
- **quotient progress** — `y >= 7 && y' = y - 7 => y' < y && 0 <= y`
  - falsifier: exhibit y,y' with y >= 7 && y' = y - 7 && (y' >= y || y < 0)
- **default comparison metrics** — `B = (E < F) => D = F-E; B = (E <= F) => D = F-E; B = (E != F) => D = abs(F-E)`
  - falsifier: exhibit a guarded body step for which the selected D does not satisfy D' < D && 0 <= D

Breaker: Attack every branch at the back edge with the ranking equation, especially invariant-preserving reverse updates from 11.2.0. Treat the defaults in 11.2.1 as candidates that still must decrease.
Implementer: Snapshot D before the body and prove a strict well-founded decrease afterward. If preservation succeeds but progress fails, redesign the body or supply a better decreases expression.

### §11.3 — Summarizing the Loop Rule
`contracts, wp-sp-calculus, termination, loops, proof-mechanics`

Error states:
- caller enters the loop with J false — the loop summary is used outside its precondition
- body decreases D but destroys J — termination is shown while partial correctness is lost
- body preserves J but leaves D unchanged — partial correctness is shown while termination is lost
- caller asserts Q after the loop even though some state satisfies J && !B && !Q — the summary is too weak for Q

Laws:
- **loop-use rule** — `{J} Loop(B,J,D,Body) {J && !B}`
  - falsifier: exhibit an execution admitted from J that exits with !J || B
- **combined body obligation** — `J(s) && B(s) && Body(s) = s' => J(s') && D(s') <_wf D(s), where <_wf is the chosen well-founded order`
  - falsifier: exhibit s,s' with J(s) && B(s) && Body(s) = s' and either !J(s') or !(D(s') <_wf D(s))
- **client consequence** — `(forall s. J(s) && !B(s) => Q(s)) => {J} Loop(B,J,D,Body) {Q}`
  - falsifier: exhibit s with J(s) && !B(s) && !Q(s)

Breaker: The packet should contain two independent red-test families: client use of J && !B, and one-step implementation of J plus decreasing D.
Implementer: Discharge the loop in three cuts: establish J, prove Body maps J && B back to J while decreasing D, then derive the requested postcondition from J && !B.

### §11.4 — Integer Square Root
`contracts, algebraic-laws, specification-design, loops, wp-sp-calculus`

Error states:
- SquareRoot(104) returns r == 9 — r*r <= 104 holds but 104 < (r+1)*(r+1) fails
- SquareRoot(104) returns r == 11 — the successor bound holds but r*r <= 104 fails
- optimized loop initializes s to 0 instead of 1 — s no longer represents (r+1)*(r+1)
- optimized update uses the wrong increment for s — guard s <= N diverges from the original square comparison and exits at the wrong r

Laws:
- **integer-square-root characterization** — `SquareRoot(N) = r => r*r <= N && N < (r+1)*(r+1), where N and r are natural numbers`
  - falsifier: exhibit N,r with SquareRoot(N) = r && (r*r > N || N >= (r+1)*(r+1))
- **cached-square representation** — `s0 = 1 = (0+1)*(0+1); s = (r+1)*(r+1) && s' = s+2*r+3 && r' = r+1 => s' = (r'+1)*(r'+1)`
  - falsifier: exhibit an initial cache s0 != 1 or a step satisfying the premises with s' != (r'+1)*(r'+1)
- **guard substitution** — `s = (r+1)*(r+1) => (s <= N <=> (r+1)*(r+1) <= N)`
  - falsifier: exhibit N,r,s with s = (r+1)*(r+1) and different truth values for s <= N and (r+1)*(r+1) <= N

Breaker: Split the postcondition into both inequalities and test each independently (11.4.0). For the optimized program, make the cached-square representation and guard equivalence separate laws (11.4.1).
Implementer: Use one desired conjunct as J and the negation of the other as B. When programming by wishing, initialize the wished-for quantity and derive its update by weakest-precondition algebra.

### §11.5 — Summary
`contracts, termination, specification-design, loops, mutation-frames`

Error states:
- loop invariant is not established before the first guard check — the implementation starts outside its specified state space
- one body branch fails to re-establish the invariant — a later exit can violate the advertised result
- all body branches preserve the invariant but one fails to decrease the metric — the loop can diverge
- an unframed local changes during the loop — the client observes a value that the loop summary treated as stable

Laws:
- **three-part loop specification** — `Spec(Loop) = (B,J,F), where B is the guard, J the invariant, and F the frame`
  - falsifier: exhibit a loop whose claimed client result depends on a guard, invariant, or frame fact absent from Spec(Loop)
- **total loop correctness** — `Pre(s0) => J(s0); J(s) && B(s) && Body(s) = s' => J(s') && D(s') <_wf D(s); loop exit s1 => J(s1) && !B(s1)`
  - falsifier: exhibit a loop violating initialization, one-step preservation, strict decrease, or the exit summary
- **frame agreement** — `v notin F && Loop(s0) = s1 => v(s1) = v(s0)`
  - falsifier: exhibit s0,s1,v with Loop(s0) = s1 && v notin F && v(s1) != v(s0)

Breaker: Use this section as the minimum loop battery: initialization, one-step preservation, strict progress, exit adequacy, and frame agreement.
Implementer: Keep loop use separate from loop implementation: clients reason only from J, !B, and the frame, while the body is discharged once from J && B.

### §12.0 — Iterative Fibonacci
`contracts, algebraic-laws, specification-design, termination, loops, wp-sp-calculus` · structures: Fibonacci sequence

Error states:
- iterative method returns a value other than Fib(n) — the efficient implementation disagrees with the recursive specification
- x and y are updated sequentially using the new x — y becomes 2*old_y instead of old_x + old_y
- invariant uses y == Fib(i-1) at i == 0 without a guard — it demands the undefined call Fib(-1)
- loop index leaves 0 <= i <= n or skips n — termination or the substitution of n for i at exit fails
- body increments i but does not advance the Fibonacci pair — x still denotes Fib(i-1) after the step

Laws:
- **Fibonacci equations** — `Fib(0) = 0; Fib(1) = 1; k >= 2 => Fib(k) = Fib(k-2) + Fib(k-1)`
  - falsifier: exhibit k with a returned Fib value that violates its applicable base or recurrence equation
- **consecutive-pair step** — `x = Fib(i) && y = Fib(i+1) && x' = y && y' = x+y && i' = i+1 => x' = Fib(i') && y' = Fib(i'+1)`
  - falsifier: exhibit i,x,y,x',y',i' satisfying the step premises with x' != Fib(i') || y' != Fib(i'+1)
- **iterative refinement** — `ComputeFib(n) = Fib(n)`
  - falsifier: exhibit n with ComputeFib(n) != Fib(n)
- **index progress and definedness** — `0 <= i < n && i' = i+1 => 0 <= i' <= n && n-i' < n-i; defined(Fib(k)) <=> k >= 0`
  - falsifier: exhibit n,i,i' violating the range or decrease, or exhibit an invariant call Fib(k) with k < 0

Breaker: Compare the iterative result to the recursive oracle and test the simultaneous pair transition, especially n == 0 and n == 1. The design warning about Fib(i-1) is a definedness test, not style.
Implementer: Apply replace-constant-by-variable: maintain x == Fib(i) until i == n, then add the adjacent value y == Fib(i+1) so the recurrence supplies the next state.

### §12.1 — Fibonacci Squared
`contracts, algebraic-laws, specification-design, termination, loops, lemmas-proofs, proof-mechanics` · structures: Fibonacci sequence

Error states:
- initial state uses y != 1 or k != 0 — the wished-for square and cross-term invariants fail before the loop
- update for y omits k — the next Fibonacci square loses the cross term 2*Fib(n)*Fib(n+1)
- updates are sequential and k reads the new y — the recurrence uses mixed generations and drifts from the specification
- compiled body performs multiplication — it violates the stated addition-only implementation constraint even if the numeric answer is right
- loop exits with x != Fib(N)*Fib(N) — the wishes were maintained for the wrong index or not maintained at all

Laws:
- **squared-Fibonacci state recurrence** — `A[n] = Fib(n)*Fib(n); B[n] = Fib(n+1)*Fib(n+1); K[n] = 2*Fib(n)*Fib(n+1); (A[0],B[0],K[0]) = (0,1,0); (A[n+1],B[n+1],K[n+1]) = (B[n],A[n]+K[n]+B[n],K[n]+B[n]+B[n])`
  - falsifier: exhibit n and a candidate base or transition tuple that differs from the stated tuple
- **SquareFib refinement** — `SquareFib(N) = Fib(N)*Fib(N)`
  - falsifier: exhibit N with SquareFib(N) != Fib(N)*Fib(N)
- **addition-only execution** — `runtime_mul_count(SquareFib,N) = 0, counting only compiled operations and excluding ghost specifications`
  - falsifier: exhibit N and an executed multiplication in the non-ghost SquareFib trace

Breaker: Test the three-component recurrence as one simultaneous transition (12.1.1-12.1.2), plus the independent no-runtime-multiplication constraint.
Implementer: Record each wish as an invariant, solve its base value, expand Fib algebraically in calc steps, and commit the coupled updates simultaneously so every right-hand side reads the old state.

### §12.2 — Powers of 2
`contracts, algebraic-laws, specification-design, termination, loops` · structures: power-of-two sequence

Error states:
- ComputePower(0) initializes p to 2 — the loop may do no iterations and returns 2 instead of Power(0) == 1
- body increments i without doubling p — p remains Power(i-1) after the step
- initial index is changed to 1 without handling n == 0 — 0 <= i <= n fails and guard i != n can move away from n
- what-is-left invariant omits the bound i <= n — n-i no longer denotes the intended remaining exponent

Laws:
- **power equations** — `Power(0) = 1; k >= 0 => Power(k+1) = 2*Power(k)`
  - falsifier: exhibit k with a returned Power value violating the base or successor equation
- **what-has-been-done step** — `p = Power(i) && p' = 2*p && i' = i+1 => p' = Power(i')`
  - falsifier: exhibit p,i,p',i' satisfying the step premises with p' != Power(i')
- **what-is-left conservation** — `0 <= i < n && p*Power(n-i) = Power(n) && p' = 2*p && i' = i+1 => p'*Power(n-i') = Power(n)`
  - falsifier: exhibit n,i,p,p',i' satisfying the premises with p'*Power(n-i') != Power(n)
- **power-loop refinement** — `ComputePower(n) = Power(n)`
  - falsifier: exhibit n with ComputePower(n) != Power(n)

Breaker: Exercise both invariant styles from 12.2.0-12.2.1 at boundary n == 0 and across one step; both must refine the same Power function.
Implementer: Use p == Power(i) when the recurrence advances naturally, or conserve p*Power(n-i) == Power(n) when the remaining-work view aligns better; keep 0 <= i <= n in either design.

### §12.3 — Sums
`contracts, algebraic-laws, specification-design, termination, loops, lemmas-proofs, wp-sp-calculus` · structures: half-open integer ranges, recursive sums

Error states:
- recursive sum includes F(hi) or omits F(lo) — it no longer represents the half-open range lo <= i < hi
- upward loop increments i before adding F(i) — it omits F(lo) and may include F(hi)
- downward loop adds F(i) before decrementing i — it includes F(hi) and omits F(lo)
- LoopUp uses s == SumUp(lo,i) but supplies no upper-extension lemma — the body cannot re-establish the invariant
- recursive function or lemma keeps width hi-lo unchanged on a branch — the recursion has no proved termination

Laws:
- **half-open recursive folds** — `SU(lo,lo) = 0; lo < hi => SU(lo,hi) = F(lo)+SU(lo+1,hi); SD(lo,lo) = 0; lo < hi => SD(lo,hi) = SD(lo,hi-1)+F(hi-1)`
  - falsifier: exhibit F,lo,hi where SU or SD violates its applicable base or recursive equation
- **direction-independent sum** — `lo <= hi => SU(lo,hi) = SD(lo,hi)`
  - falsifier: exhibit F,lo,hi with lo <= hi && SU(lo,hi) != SD(lo,hi)
- **upper and lower extension** — `lo < hi => SU(lo,hi-1)+F(hi-1) = SU(lo,hi) && F(lo)+SD(lo+1,hi) = SD(lo,hi)`
  - falsifier: exhibit F,lo,hi with lo < hi and either extension equality false
- **iterative sum refinement** — `lo <= hi => LoopUp(lo,hi) = LoopDown(lo,hi) = SU(lo,hi) = SD(lo,hi)`
  - falsifier: exhibit F,lo,hi with lo <= hi and one loop result unequal to SU(lo,hi) or SD(lo,hi)
- **interval-width decrease** — `w = hi-lo; every recursive call uses w' with 0 <= w' < w`
  - falsifier: exhibit a non-base recursive branch with w' >= w || w' < 0

Breaker: Use an arbitrary F that makes endpoint mistakes visible, then compare both recursive definitions and both loop directions. Require the append/prepend equalities from 12.3.0 and 12.3.2, not just a few numeric examples.
Implementer: For LoopUp, either use SumDown directly, call AppendSumUp, or conserve s + SumUp(i,hi); use the dual choices for LoopDown. Preserve post-increment upward and pre-decrement downward ordering (12.3.3).

### §12.4 — Summary
`algebraic-laws, specification-design, loops, lemmas-proofs` · structures: half-open integer ranges, recursive sums

Error states:
- iteration direction and recursive unfolding direction disagree with no bridge lemma — the chosen invariant is not preserved
- upward loop consumes F(i+1) instead of F(i) — its result shifts the half-open range by one
- downward loop consumes F(i) before decrementing — it includes the excluded upper endpoint and misses the lower endpoint

Laws:
- **recursive-iterative agreement** — `IterUp(lo,hi) = IterDown(lo,hi) = RecUp(lo,hi) = RecDown(lo,hi)`
  - falsifier: exhibit F,lo,hi with lo <= hi and any two of the four results unequal
- **index-consumption order** — `UpStep(s,i) = (s+F(i),i+1); DownStep(s,i) = (s+F(i-1),i-1)`
  - falsifier: exhibit an upward step that consumes an index other than old i or a downward step that consumes an index other than old i-1
- **direction bridge** — `RecUp(lo,hi) = RecDown(lo,hi), so either recursive orientation may specify either loop orientation when this equality is available`
  - falsifier: exhibit F,lo,hi with lo <= hi && RecUp(lo,hi) != RecDown(lo,hi)

Breaker: Demand extensional agreement across both recursion and iteration directions, with endpoint-sensitive tests rather than commutative examples that hide ordering errors.
Implementer: Align the invariant with the recurrence that unfolds at the index being consumed; if directions differ, introduce the exact bridge lemma instead of weakening the invariant.

### §13.0 — About Arrays
`arrays-search, mutation-frames, algebraic-laws, assertions, background` · structures: mutable one-dimensional arrays, two-dimensional arrays/matrices, immutable sequences

Error states:
- An access uses i < 0 or i >= a.Length and reads or writes an element instead of failing the bounds obligation.
- A point update a[i] := v changes a[j] for i != j, or two equal index expressions are incorrectly treated as distinct cells.
- var b := a is treated as a deep copy, so writing b[i] leaves a[i] unchanged.
- A captured sequence s := a[..] changes after a is mutated, or a slice has the wrong endpoints or length.

Laws:
- **Index validity and array snapshot length** — `validIndex(a,i) iff 0 <= i && i < len(a); len(a[..]) == len(a) (len(a)=a.Length)`
  - falsifier: exhibit a with len(a)=3 and i=3 where a[i] is accepted, or a[..] has length other than 3
- **Point-update locality** — `write(a,i,v)[j] == (if j == i then v else a[j]) for validIndex(a,i)`
  - falsifier: exhibit a,i,j,v with i != j and write(a,i,v)[j] != a[j]
- **Reference alias visibility** — `a == b && write(b,i,v) => a[i] == v (a and b are the same array reference)`
  - falsifier: exhibit b := a and a write through b such that the observed a[i] != v
- **Immutable sequence snapshot** — `s := a[..]; write(a,i,v) => s == old(a[..]) and s[i] == old(a[i])`
  - falsifier: exhibit a,i,v where s := a[..] and after write(a,i,v), s[i] != old(a[i])
- **Half-open slice splitting** — `0 <= lo <= mid <= hi <= |s| => s[lo..mid] + s[mid..hi] == s[lo..hi] (|s|=sequence length)`
  - falsifier: exhibit s,lo,mid,hi in range with s[lo..mid] + s[mid..hi] != s[lo..hi]

Breaker: Use bounds, point-update locality, alias visibility, and immutable snapshots as red tests. The slice-splitting law is the extensionality fact later proofs depend on (13.0.1-13.0.4).
Implementer: Treat arrays as heap references and sequences as values. Prove every index range before access, and use half-open slices as the stable mathematical view of array regions (13.0.0-13.0.4).

### §13.1 — Linear Search
`contracts, assertions, wp-sp-calculus, loops, termination, arrays-search, algebraic-laws, specification-design` · structures: array<T>, compiled predicate P: T -> bool, integer search index n, quantified index ranges

Error states:
- The method returns n < 0 or n > a.Length, or evaluates P(a[n]) when n == a.Length.
- The method returns a.Length even though some valid index i satisfies P(a[i]).
- The method returns a later matching index while an earlier index j < n also satisfies P(a[j]).
- The loop increments without a successful check or fails to decrease a.Length - n, so it can skip a match or fail to terminate.

Laws:
- **Search result contract** — `0 <= n && n <= L && (n == L || P(a[n])) (L=len(a))`
  - falsifier: exhibit a with L=2 and an implementation result n=3, or n=2 while evaluating P(a[2])
- **Defeat must be justified** — `n == L => forall i :: 0 <= i && i < L => !P(a[i])`
  - falsifier: exhibit a=[4,7], P(x)=x==7, and an implementation returning n=L
- **First-match guarantee** — `P(a[n]) => forall i :: 0 <= i && i < n => !P(a[i])`
  - falsifier: exhibit a=[7,7], P(x)=x==7, and an implementation returning n=1
- **Existential precondition forces success** — `(exists i :: 0 <= i && i < L && P(a[i])) => n < L && P(a[n])`
  - falsifier: exhibit a=[7], P(x)=x==7, and an implementation returning n=L
- **Quantifier range split** — `forall i :: 0 <= i && i < n+1 => !P(a[i]) iff (forall i :: 0 <= i && i < n => !P(a[i])) && !P(a[n])`
  - falsifier: exhibit a=[7], n=0, P(x)=x==7, with the prefix condition true but the n+1 condition false
- **Variant progress** — `not P(a[n]) && n' == n+1 => (L-n') == (L-n)-1`
  - falsifier: exhibit a length L and a loop branch with n'=n, so L-n' == L-n

Breaker: Break the result contract, the no-match justification, firstness, and the existential-success implication. Also mutate the range split or the variant to catch an unchecked increment and nontermination (13.1.1-13.1.5).
Implementer: Use the index as a replace-constant-by-variable invariant; on each iteration preserve the already-ruled-out prefix and check the current element before advancing. With a known witness, switch to the invariant that a witness remains at or after n and supply decreases L-n (13.1.1, 13.1.4).

### §13.2 — Binary Search
`contracts, assertions, loops, termination, arrays-search, algebraic-laws, specification-design` · structures: sorted integer array, half-open search window [lo,hi), too-small and too-big array sections, earliest insertion index

Error states:
- An unsorted array is accepted, so the search discards a region that can contain the key.
- The returned n leaves some i < n with a[i] >= key or some i >= n with a[i] < key, so it is not an insertion point.
- A present key is reported absent, or the method returns a later occurrence instead of the leftmost insertion point.
- A midpoint is outside the current window and is used for an invalid array access.
- Replacing lo := mid + 1 with lo := mid leaves a one-element window unchanged and the loop does not terminate.

Laws:
- **Global sortedness** — `forall i,j :: 0 <= i && i < j && j < L => a[i] <= a[j] (L=len(a))`
  - falsifier: exhibit a=[2,1] that is accepted as sorted, with i=0 and j=1 violating a[i] <= a[j]
- **Earliest insertion partition** — `0 <= n && n <= L && (forall i :: 0 <= i && i < n => a[i] < key) && (forall i :: n <= i && i < L => key <= a[i])`
  - falsifier: exhibit a=[1,3], key=2, and n=0 or n=2
- **Contains equivalence** — `(n < L && a[n] == key) iff (exists i :: 0 <= i && i < L && a[i] == key)`
  - falsifier: exhibit a=[1,2,2], key=2, with a search result n=3 or a[n] != key despite a matching element
- **Midpoint lies in the window** — `lo < hi && mid=floor((lo+hi)/2) => lo <= mid && mid < hi`
  - falsifier: exhibit lo=0, hi=1 and a buggy midpoint mid=1, which is not a valid element of [lo,hi)
- **Window strictly shrinks** — `if a[mid] < key then (lo',hi')=(mid+1,hi); else (lo',hi')=(lo,mid); in both cases hi'-lo' < hi-lo`
  - falsifier: exhibit lo=0, hi=1 with buggy then update lo'=mid=0, leaving hi'-lo' == hi-lo

Breaker: Test global sortedness, the two insertion partitions, Contains, midpoint bounds, and strict window shrinkage. The one-element-window mutation is the tight termination breaker (13.2.0-13.2.2).
Implementer: Maintain the two quantified exclusion regions around [lo,hi), and move the midpoint into exactly one region: lo=mid+1 when it is too small, hi=mid otherwise. Use the window width as the decreases measure (13.2.2).

### §13.3 — Minimum
`contracts, assertions, loops, arrays-search, algebraic-laws, specification-design` · structures: nonempty integer array, loop index n, candidate minimum m, quantified array indices

Error states:
- The method returns a value below every array element but not equal to any element, such as an arbitrary uninitialized out-parameter.
- Initialization m := a[0] is attempted on an empty array.
- A smaller later element is ignored, so the returned m is greater than some a[i].
- The loop exits with a valid lower bound but without preserving that m came from the array.

Laws:
- **Minimum lower bound** — `forall i :: 0 <= i && i < L => m <= a[i] (L=len(a))`
  - falsifier: exhibit a=[2,10,1] and m=2, since m <= a[2] is false
- **Minimum is an input** — `L != 0 => exists i :: 0 <= i && i < L && m == a[i]`
  - falsifier: exhibit a=[2,10] and m=0, which is a lower bound but is not an array element
- **Candidate update preserves the minimum** — `m' == (if a[n] < m then a[n] else m) => m' <= m && m' <= a[n]`
  - falsifier: exhibit m=10, a[n]=1, and an update producing m'=10
- **Witness initialization requires nonempty input** — `L != 0 => exists i :: 0 <= i && i < L`
  - falsifier: exhibit L=0 with code attempting m := a[0]

Breaker: The red tests must distinguish a lower bound from an actual input minimum and must reject empty-array initialization. A valid implementation cannot lose a smaller later element (13.3.0-13.3.2).
Implementer: Start with a witnessed element, make the final witness postcondition an invariant, and update the candidate only when the next element is smaller. The added witness obligation exposes the needed nonempty precondition (13.3.1).

### §13.4 — Coincidence Count
`contracts, assertions, loops, termination, arrays-search, lemmas-proofs, algebraic-laws, specification-design` · structures: two sorted integer arrays, array-to-sequence views, half-open slices, multisets with intersection and cardinality, loop indices m and n

Error states:
- Duplicates are counted as distinct values rather than by multiset intersection, so a=[1,1] and b=[1] incorrectly produce c=2.
- An equal head increments c but fails to advance both indices, or advances an index without counting the equal pair.
- When a[m] < b[n], the implementation advances the wrong side and can discard a remaining coincidence, such as a=[1,2], b=[2].
- The loop exits with one tail empty while the residual tails still contribute to c, or a branch leaves the termination measure unchanged.

Laws:
- **Coincidence result** — `c == |M(a[..]) * M(b[..])| (M(s)=multiset(s), *=multiset intersection, |X|=cardinality)`
  - falsifier: exhibit a=[1,1], b=[1] with c=2 instead of 1
- **What's-yet-to-be-done conservation** — `c + |M(a[m..]) * M(b[n..])| == |M(a[..]) * M(b[..])|`
  - falsifier: exhibit a=[1], b=[1], and post-state c=0,m=1,n=1, giving 0 != 1
- **Equal-head decomposition** — `sorted(a) && sorted(b) && a[m] == b[n] => M(a[m..]) * M(b[n..]) == {a[m]} + (M(a[m+1..]) * M(b[n+1..]))`
  - falsifier: exhibit a=[1], b=[1], m=n=0 with the singleton term omitted, making cardinalities 1 and 0
- **Advance the smaller head** — `a[m] < b[n] => M(a[m..]) * M(b[n..]) == M(a[m+1..]) * M(b[n..]); b[n] < a[m] => M(a[m..]) * M(b[n..]) == M(a[m..]) * M(b[n+1..])`
  - falsifier: exhibit a=[1,2], b=[2], m=n=0, and advance n instead of m, yielding residual cardinality 0 instead of 1
- **Tail exhaustion closes the proof** — `m == len(a) || n == len(b) => |M(a[m..]) * M(b[n..])| == 0`
  - falsifier: exhibit an exit state with m=len(a), n<len(b), but a nonempty tail for a or a nonzero residual intersection
- **Termination measure decreases** — `V=len(a)-m + len(b)-n; every case gives V' < V`
  - falsifier: exhibit a branch with m'=m and n'=n, so V' == V

Breaker: Use multiset-preserving tests for duplicates, equal heads, and both smaller-head branches. The conservation law plus tail exhaustion catches dropped or unprocessed matches; the variant catches stalled branches (13.4.1-13.4.6).
Implementer: Write the residual-tail invariant first, then make each comparison case preserve it and reduce the sum of remaining lengths. When automation fails, isolate a branch with an assertion and discharge sequence extensionality, multiset distribution, and commutativity through focused lemmas (13.4.3-13.4.6).

### §13.5 — Slope Search
`contracts, assertions, loops, termination, arrays-search, algebraic-laws, specification-design` · structures: rectangular two-dimensional integer array, matrix row and column indices (m,n), monotone rows and columns, key contour and shrinking search rectangle

Error states:
- The search moves in the wrong direction and skips a key that exists in the remaining rectangle.
- A move leaves m or n outside the matrix bounds, causing the next a[m,n] access to be invalid.
- The rectangle witness invariant is lost, so the loop can terminate without returning a cell equal to key.
- The loop changes neither the row nor the column or uses a nondecreasing variant, so it can fail to terminate.

Laws:
- **Row and column monotonicity** — `(j < j' => a[i,j] <= a[i,j']) && (i < i' => a[i,j] <= a[i',j]) for valid row and column indices`
  - falsifier: exhibit a matrix and valid i,j,j' or i,i',j where a step East or South decreases the value
- **Rectangle witness invariant** — `0 <= m && m < L0 && 0 <= n && n < L1 && exists i,j :: m <= i && i < L0 && 0 <= j && j <= n && a[i,j] == key`
  - falsifier: exhibit a state with valid m,n but no key in rows m..L0 and columns 0..n
- **Less-than branch eliminates a row** — `a[m,n] < key => forall j :: 0 <= j && j <= n => a[m,j] < key`
  - falsifier: exhibit a[m,n] < key but some valid j <= n has a[m,j] >= key
- **Greater-than branch eliminates a column** — `a[m,n] > key => forall i :: m <= i && i < L0 => a[i,n] > key`
  - falsifier: exhibit a[m,n] > key but some valid i >= m has a[i,n] <= key
- **Variant progress and result** — `V=L0-m+n; m'=m+1 or n'=n-1 => V'=V-1; guard false => a[m,n] == key`
  - falsifier: exhibit a branch with no index change, or a guard-false state with a[m,n] != key

Breaker: Break monotonicity, the rectangle witness, either branch's elimination fact, and the row/column variant. Boundary moves are especially important because the next loop guard still indexes the matrix (13.5.0-13.5.1).
Implementer: Start at the upper-right corner so the remaining witness rectangle is the whole matrix, then move down when the current value is too small and left when it is too large. Keep proper-index bounds as an invariant and use L0-m+n as the decreasing measure (13.5.0-13.5.1).

### §13.6 — Canyon Search
`contracts, assertions, loops, termination, arrays-search, algebraic-laws, specification-design` · structures: two nonempty sorted integer arrays, implicit distance matrix Dist(a[i],b[j]), loop indices m and n, current minimum candidate d, L-shaped excluded region

Error states:
- The method accesses a[0] or b[0] when either input is empty.
- It returns a distance not realized by any pair of input elements.
- It misses a closer pair by advancing the wrong index, such as a=[0,100], b=[50,51], where the true minimum is 49.
- It proves d is minimal only in the visited L-shaped region but exits while a closer pair remains in the unexplored corner.

Laws:
- **Absolute-distance algebra** — `Dist(x,y) == (if x < y then y-x else x-y); Dist(x,y) == Dist(y,x) && Dist(x,y) >= 0`
  - falsifier: exhibit x,y with Dist(x,y) != Dist(y,x), or a negative returned distance
- **Minimum is attained** — `exists i,j :: 0 <= i && i < La && 0 <= j && j < Lb && d == Dist(a[i],b[j]) (La=len(a), Lb=len(b))`
  - falsifier: exhibit nonempty a,b and d not equal to Dist(a[i],b[j]) for any valid pair
- **Global minimum lower bound** — `forall i,j :: 0 <= i && i < La && 0 <= j && j < Lb => d <= Dist(a[i],b[j])`
  - falsifier: exhibit a valid pair with Dist(a[i],b[j]) < d
- **Frontier monotonicity** — `sorted(a) && sorted(b) && a[m] <= b[n] => forall j >= n: Dist(a[m],b[n]) <= Dist(a[m],b[j]); b[n] <= a[m] => forall i >= m: Dist(a[m],b[n]) <= Dist(a[i],b[n])`
  - falsifier: exhibit sorted arrays and a frontier comparison where an onward distance is smaller than the current frontier distance
- **Weakened L-shaped invariant** — `forall i,j :: valid(i,j) => d <= Dist(a[i],b[j]) || (m <= i && n <= j)`
  - falsifier: exhibit valid i,j outside the excluded corner with Dist(a[i],b[j]) < d
- **Minimum update and termination** — `d' == min(d,Dist(a[m],b[n])); V=La-m+Lb-n; every iteration gives d' <= d and V' < V`
  - falsifier: exhibit a current pair closer than d that is not incorporated, or a branch with V' == V

Breaker: Test attainedness separately from the lower-bound claim, then target the frontier direction with arrays where the closest pair is beyond one current index. The L-shaped invariant and decreasing sum catch premature exit and stalled scans (13.6.0-13.6.2).
Implementer: Initialize d from a real pair, weaken the universal postcondition over the unexplored corner, and update d before advancing one frontier. Sortedness tells which index can move without losing a possible minimum (13.6.1-13.6.2).

### §13.7 — Majority Vote
`contracts, assertions, loops, termination, inductive-data, lemmas-proofs, algebraic-laws, specification-design, proof-mechanics` · structures: sequence of comparable candidates, half-open vote intervals, Count function, candidate k and count c, ghost witnesses K, hasWinner, and w, Result datatype with NoWinner and Winner(Candidate)

Error states:
- Count has an off-by-one error and counts a[hi] or omits a[hi-1], so Count([x],0,1,x) is not 1.
- The loop resets k or c without preserving c == Count(a,lo,hi,k), so it loses the true majority or returns a non-majority candidate.
- The algorithm discards a prefix that still gives the true winner a strict majority, so the suffix no longer has the required winner.
- Two distinct candidates are treated as strict-majority winners, or DetermineElection returns Winner(c) for a non-majority c or NoWinner when a majority exists.
- An assign-such-that ghost witness is used without proving existence, or hi fails to advance and the scan does not terminate.

Laws:
- **Count recurrence** — `Count(a,lo,hi,x) == (if lo == hi then 0 else Count(a,lo,hi-1,x) + (if a[hi-1] == x then 1 else 0)) (Count counts a[lo..hi))`
  - falsifier: exhibit a=[x], lo=0, hi=1 with Count(a,lo,hi,x) == 0
- **Count split** — `0 <= lo <= mid <= hi <= |a| => Count(a,lo,mid,x) + Count(a,mid,hi,x) == Count(a,lo,hi,x)`
  - falsifier: exhibit a=[x,y], lo=0, mid=1, hi=2 where the split sum differs from Count(a,0,2,x)
- **Distinct-count bound** — `x != y => Count(a,lo,hi,x) + Count(a,lo,hi,y) <= hi-lo`
  - falsifier: exhibit distinct x,y and a[lo..hi] where the two counts sum to more than hi-lo
- **Strict-majority uniqueness** — `HasMajority(a,lo,hi,x) && HasMajority(a,lo,hi,y) => x == y (HasMajority(a,p,q,x) iff q-p < 2*Count(a,p,q,x))`
  - falsifier: exhibit distinct x,y both reported as majority in the same interval
- **Majority survives cancellation** — `HasMajority(a,lo,|a|,K) && 2*Count(a,lo,hi,K) <= hi-lo => HasMajority(a,hi,|a|,K)`
  - falsifier: exhibit a,lo,hi,K satisfying the antecedent but with |a|-hi >= 2*Count(a,hi,|a|,K)
- **Candidate loop invariant** — `0 <= lo <= hi <= |a| && c == Count(a,lo,hi,k) && HasMajority(a,lo,hi,k) && (hasWinner => HasMajority(a,lo,|a|,K))`
  - falsifier: exhibit a=[A,B,A] and reset state lo=2,hi=3,k=A,c=0, where c != Count(a,2,3,A)
- **Assign-such-that witness** — `assignSuchThat(P) succeeds => exists x :: P(x) and P(chosen)`
  - falsifier: exhibit a sequence with no K satisfying HasMajority(a,0,|a|,K) but attempt ghost K :| HasMajority(a,0,|a|,K)
- **Election result exactness** — `result=Winner(c) => HasMajority(a,0,|a|,c); result=NoWinner => !exists c :: HasMajority(a,0,|a|,c)`
  - falsifier: exhibit a=[A,A,B] returning NoWinner or Winner(B)
- **Scan progress** — `V=|a|-hi; every nonreturning loop branch has hi'=hi+1 and V'=V-1`
  - falsifier: exhibit a branch with hi'=hi, so V' == V

Breaker: Break Count and split arithmetic first, then target cancellation, candidate-state preservation, unique majority, and exact Winner/NoWinner results. Include a ghost-witness absence case and a stalled hi update (13.7.0-13.7.5).
Implementer: Build the proof around Count, SplitCount, and DistinctCounts; maintain a witnessed majority candidate over the active interval and preserve the whole-sequence winner through canceled prefixes. Use ghost values only to expose proof witnesses, then recheck the candidate at runtime before constructing Result (13.7.0-13.7.5).

### §14.0 — Simple Frames
`contracts, specification-design, mutation-frames, proof-mechanics` · structures: heap, arrays, sequences

Error states:
- method changes an existing array not named by its write frame — an unlisted location differs between the pre-state and post-state
- increment specification uses old(a)[i] instead of old(a[i]) — it reads the post-state element rather than the entry value
- factory returns an old aliased array while its caller treats the result as newly allocated — fresh(result) is false and a caller update smashes existing state
- function reads an array outside its read frame — its result changes although the heaps agree on every declared dependency

Laws:
- **Write-frame confinement** — `ChangedExisting(H,H') subseteq M, where H and H' are the pre/post heaps, M is the modifies set evaluated in H, and ChangedExisting contains pre-existing objects whose state differs`
  - falsifier: exhibit H,H' and pre-existing object o with o in ChangedExisting(H,H') and o notin M
- **Pre-state dereference** — `eval_H'(old(a[i])) = eval_H(a[i]), whereas eval_H'(old(a)[i]) = eval_H'(a[i]); old affects the heap dereference, not parameter a`
  - falsifier: exhibit an increment call with post(a[i]) != pre(a[i]) + 1 after specifying the relation with old(a)[i]
- **Fresh-result guarantee** — `fresh_H,H'(S) <=> forall o in S: o notin Alloc(H) and o in Alloc(H'), where S is a returned reference or set of references`
  - falsifier: exhibit returned o with o in Alloc(H) despite fresh(o)
- **Read-frame stability** — `Agree(H,H',R) => f_H(args) = f_H'(args), where R is f's reads set and Agree means all fields or elements of objects in R are equal`
  - falsifier: exhibit H,H' agreeing on R with f_H(args) != f_H'(args)

Breaker: Use the frame and two-state laws from 14.0.0–14.0.4 to distinguish a correct result from one obtained by corrupting caller state. Test aliases explicitly, because frames name objects rather than the expressions used to reach them.
Implementer: Put every existing object that may change in modifies and every mutable dependency in reads. Place old around the actual field or array dereference, and promise fresh results when callers must be able to mutate newly allocated storage.

### §14.1 — Basic Array Modification
`contracts, wp-sp-calculus, loops, arrays-search, mutation-frames, proof-mechanics` · structures: arrays, two-dimensional arrays, sequences, array slices

Error states:
- initialization exits with an untouched element or matrix cell — the initialized prefix or rows never cover the full index domain
- inner matrix loop initializes the current row but clobbers an earlier row because its invariant omits the already completed rows
- increment loop establishes the updated prefix but silently changes an unprocessed suffix element — post(a[i]) is not pre(a[i]) + 1
- copy accepts src == dst but relates dst to the current source rather than the entry source — arbitrary in-place changes satisfy the apparent equality
- left rotation is performed sequentially rather than simultaneously — later assignments read already overwritten elements

Laws:
- **Total initialization** — `InitArray(A,d) => forall i with 0 <= i < len(A): post(A[i]) = d; InitMatrix(M,d) => forall i,j in bounds: post(M[i,j]) = d`
  - falsifier: exhibit an output array or matrix with an in-bounds position k whose value is not d
- **Processed-prefix and untouched-suffix invariant** — `I(n,A,A0) := 0 <= n <= N and (forall i with 0 <= i < n: A[i] = A0[i] + 1) and (forall i with n <= i < N: A[i] = A0[i]), where N=len(A) and A0 is the entry snapshot`
  - falsifier: exhibit a loop-head state satisfying the processed-prefix clause but with some i >= n having A[i] != A0[i]
- **Alias-safe copy** — `len(src)=len(dst) => forall i with 0 <= i < len(src): post(dst[i]) = pre(src[i]), including the case src == dst`
  - falsifier: exhibit src,dst and i with post(dst[i]) != pre(src[i])
- **Simultaneous aggregate update** — `forall-update A[i] := F(i,A) means post(A[i]) = F(i,pre(A)) for every selected i; for N>0, left rotation therefore satisfies post(A[i]) = pre(A[(i+1) mod N])`
  - falsifier: exhibit A and i with post(A[i]) computed from an already updated element rather than pre(A[(i+1) mod N])

Breaker: Attack both halves of each quantified update: the processed region and the region that must remain unchanged. Sections 14.1.2–14.1.4 make aliasing and snapshot semantics especially important test dimensions.
Implementer: Derive loop invariants by replacing a postcondition bound with the loop index, then preserve all earlier work in nested loops. When uniform updates are independent, use constructor or aggregate semantics so every right-hand side observes the same pre-update state.

### §14.2 — Summary
`contracts, loops, arrays-search, mutation-frames, specification-design` · structures: heap, arrays

Error states:
- method returns the expected value after changing an array outside its declared write frame
- function value changes after a mutation to an object outside its declared read frame
- postcondition compares only post-state values and therefore fails to describe the intended relation to the input state
- array loop proves a property of its processed prefix but exits before that prefix covers the whole array

Laws:
- **Frame separation** — `existing writes are confined to modifies M, and a function result depends only on reads R: ChangedExisting(H,H') subseteq M and Agree(H,H',R) => f_H(x)=f_H'(x)`
  - falsifier: exhibit either an existing changed object outside M or two heaps agreeing on R with different function results
- **Two-state update contract** — `for an element transformer T, forall in-bounds i: post(A[i]) = T(pre(A[i]))`
  - falsifier: exhibit A and i with post(A[i]) != T(pre(A[i]))
- **Fresh allocation boundary** — `fresh(S) => S intersect Alloc(pre) = {}, where S is a returned reference set`
  - falsifier: exhibit o in S intersect Alloc(pre)
- **Loop coverage** — `I(n) := 0 <= n <= N and forall i with 0 <= i < n: P(i); I(n) and n=N => forall i with 0 <= i < N: P(i)`
  - falsifier: exhibit an exit state with I(n) and n != N, or an in-bounds i for which P(i) is false

Breaker: The chapter summary makes frames, old values, freshness, and quantified coverage part of the same mutation contract. A passing output-only test is insufficient if heap confinement or preservation is untested.
Implementer: Carry an entry snapshot into update properties, expose allocation freshness when needed by callers, and make loop exit turn the growing processed region into the full postcondition.

### §15.0 — Dutch National Flag
`contracts, algebraic-laws, loops, termination, arrays-search, mutation-frames` · structures: arrays of colors, four adjacent array segments, multisets

Error states:
- method returns colors in red-white-blue order but loses or duplicates an input color — sorted(post) holds while bag(post) != bag(pre)
- red branch copies a[w] into the red region without preserving the displaced white element
- blue branch overwrites a[b-1] instead of swapping — the blue value is duplicated and the displaced value is lost
- segment markers overlap or leave a classified element in the wrong region
- a branch neither increments w nor decrements b — the unsorted segment never shrinks

Laws:
- **Color ordering** — `SortedColor(A) := forall i,j with 0 <= i < j < N: Below(A[i],A[j]), where Below(c,d) := c=Red or c=d or d=Blue; DutchFlag requires SortedColor(post(A))`
  - falsifier: exhibit post(A) and i<j with not Below(A[i],A[j])
- **Permutation conservation** — `bag(post(A)) = bag(pre(A)), where bag records each color's multiplicity`
  - falsifier: exhibit A with bag(post(A)) != bag(pre(A))
- **Four-segment invariant** — `0 <= r <= w <= b <= N and (forall i<r: A[i]=Red) and (forall r<=i<w: A[i]=White) and (forall b<=i<N: A[i]=Blue) and bag(A)=bag(A0)`
  - falsifier: exhibit a loop-head state violating a marker bound, a region color, or bag(A)=bag(A0)
- **Unsorted-segment descent** — `V := b-w; while w<b, every branch establishes V' = V-1 and V >= 1`
  - falsifier: exhibit a guarded iteration with b'-w' >= b-w

Breaker: Require both order and multiset preservation; either property alone admits a broken sorter. Use the four-segment invariant and the exact b-w descent equation to generate branch-specific red tests.
Implementer: Treat r, w, and b as boundaries of half-open regions. Extend one classified region per iteration, swap rather than overwrite displaced values, and preserve the multiset as an always invariant.

### §15.1 — Selection Sort
`contracts, algebraic-laws, loops, termination, arrays-search, mutation-frames, proof-mechanics` · structures: integer arrays, sorted prefixes, unsorted suffixes, multisets

Error states:
- method returns a sorted array that lost or duplicated elements — sorted(post) holds but bag(post) != bag(pre)
- outer loop maintains a sorted prefix but chooses a new element smaller than that prefix because the split-point invariant is missing
- inner loop's mindex falls outside the examined suffix or does not identify a minimum of the examined elements
- inner or outer index fails to advance, so sorting does not terminate

Laws:
- **Selection-sort contract** — `Sorted(post(A)) and bag(post(A))=bag(pre(A)), where Sorted(A) := forall i,j with 0 <= i < j < N: A[i] <= A[j]`
  - falsifier: exhibit A with not Sorted(post(A)) or bag(post(A)) != bag(pre(A))
- **Split-point invariant** — `SplitPoint(A,n) := forall i,j with 0 <= i < n <= j < N: A[i] <= A[j]`
  - falsifier: exhibit A,n,i,j with i<n<=j and A[i] > A[j]
- **Minimum witness invariant** — `n <= mindex < m <= N and forall i with n <= i < m: A[mindex] <= A[i]`
  - falsifier: exhibit an inner-loop state with mindex outside [n,m) or some examined i with A[mindex] > A[i]
- **Nested-loop descent** — `Vouter:=N-n decreases by 1 after each outer body, and Vinner:=N-m decreases by 1 after each inner body`
  - falsifier: exhibit a guarded outer or inner iteration with its corresponding variant not smaller afterward

Breaker: A sorted-prefix assertion is too weak: Section 15.1's decisive law is that every prefix element is also below every suffix element. Pair that split point with a witnessed minimum and multiset preservation.
Implementer: Keep mindex inside the examined interval and record its minimum property. Before extending the sorted prefix, preserve both its internal ordering and its ordering relative to the unsorted suffix.

### §15.2 — Quicksort
`contracts, algebraic-laws, termination, arrays-search, mutation-frames, proof-mechanics` · structures: integer arrays, bounded array segments, pivots, multisets, recursive subproblems

Error states:
- QuicksortAux returns with an inversion inside a[lo..hi)
- partition or recursive sorting changes an element outside a[lo..hi)
- partition swaps within the segment but loses or duplicates an element — the whole-array multiset changes
- Partition returns p outside [lo,hi) or leaves a left element at least as large as the pivot or a right element smaller than it
- recursive calls fail to shrink or destroy a split-point boundary, so recursion diverges or separately sorted segments do not compose

Laws:
- **Subrange sorting** — `forall i,j with lo <= i < j < hi: post(A[i]) <= post(A[j])`
  - falsifier: exhibit lo,hi,i,j with lo<=i<j<hi and post(A[i]) > post(A[j])
- **Swap frame** — `SwapFrame(A,lo,hi) := (forall i with i<lo or hi<=i<N: post(A[i])=pre(A[i])) and bag(post(A))=bag(pre(A))`
  - falsifier: exhibit a call with an outside index changed or bag(post(A)) != bag(pre(A))
- **Partition contract** — `lo <= p < hi and (forall i with lo <= i < p: A[i] < A[p]) and (forall i with p <= i < hi: A[p] <= A[i])`
  - falsifier: exhibit p outside [lo,hi), a left i with A[i]>=A[p], or a right i with A[i]<A[p]
- **Split-point preservation** — `SplitPoint(pre(A),lo) and SplitPoint(pre(A),hi) => SplitPoint(post(A),lo) and SplitPoint(post(A),hi)`
  - falsifier: exhibit a call beginning with both split points and ending with either split point false
- **Recursive-segment descent** — `if hi-lo>=2 and lo<=p<hi, then p-lo < hi-lo and hi-(p+1) < hi-lo`
  - falsifier: exhibit lo,hi,p for which a recursive child has length greater than or equal to hi-lo

Breaker: Break Quicksort at its composition seams: Partition's pivot law, the two-state swap frame, preserved split points, and strict child-size decrease. These are the contracts that make the two recursive results compose into one sorted segment.
Implementer: Specify the exact subrange, preserve outside elements and the global multiset, and carry split points through every call. In Partition, maintain lower, unknown, and upper regions plus the swap frame, then return an in-range pivot that makes both recursive variants smaller.

### §15.3 — Summary
`loops, proof-mechanics, algebraic-laws, arrays-search` · structures: arrays, loop states, multisets

Error states:
- loop invariant is false initially, so the proof assumes a property the program never establishes
- loop body preserves the invariant only on expected executions but fails for another state satisfying the invariant and guard
- loop exits with its invariant true but the invariant is too weak to imply the postcondition
- sorting routine establishes order but not preservation of input multiplicities

Laws:
- **Invariant initialization** — `Pre(s0) => I(s0), where s0 is the state at loop entry and I is the proposed invariant`
  - falsifier: exhibit s0 with Pre(s0) and not I(s0)
- **Invariant inductiveness** — `forall states s: I(s) and Guard(s) => I(Step(s))`
  - falsifier: exhibit s with I(s) and Guard(s) and not I(Step(s))
- **Exit adequacy** — `forall states s: I(s) and not Guard(s) => Post(s)`
  - falsifier: exhibit s with I(s) and not Guard(s) and not Post(s)
- **In-situ sorting conjunction** — `Sorted(post(A)) and bag(post(A))=bag(pre(A))`
  - falsifier: exhibit A with an inversion in post(A) or unequal pre/post multiplicities

Breaker: Treat the invariant as a public algebraic claim over every state satisfying it, not merely states observed in one execution. Sorting tests must independently challenge order and element preservation.
Implementer: Record all loop-design decisions in the invariant, prove initialization and one arbitrary iteration, and ensure invariant plus guard negation yields the full postcondition.

### §16.0 — Checksums
`contracts, specification-design, abstraction-modules, representation-invariants, loops, mutation-frames, objects-dynamic-frames` · structures: ChecksumMachine objects, strings, character sequences, object fields

Error states:
- constructor returns a machine whose data is nonempty or whose stored checksum disagrees with Hash(data)
- Append extends the abstract data but fails to update cs, leaving Valid false and Checksum stale
- Append updates cs correctly but fails to append exactly d to the ghost data model
- Checksum returns a value other than Hash(data) despite the object being valid
- method changes a different pre-existing object's fields although its frame names only this

Laws:
- **Checksum refinement invariant** — `Valid(m) <=> m.cs = Hash(m.data), where Hash(s)=SumChars(s) mod 137`
  - falsifier: exhibit m with Valid(m) claimed and m.cs != Hash(m.data)
- **Incremental hash law** — `Hash(s+[ch]) = (Hash(s)+ord(ch)) mod 137, where [ch] is the one-character sequence and ord converts ch to int`
  - falsifier: exhibit s,ch with Hash(s+[ch]) != (Hash(s)+ord(ch)) mod 137
- **Constructor establishment** — `post(Valid(m)) and post(m.data)="" and post(m.cs)=0`
  - falsifier: exhibit a newly constructed m with nonempty data, cs!=0, or not Valid(m)
- **Append abstraction contract** — `Valid_pre(m) => Valid_post(m) and post(m.data)=pre(m.data)+d`
  - falsifier: exhibit valid m,d with invalid post-state or post(data) != pre(data)+d
- **Checksum observation** — `Valid(m) => m.Checksum() = Hash(m.data)`
  - falsifier: exhibit valid m with m.Checksum() != Hash(m.data)

Breaker: Use the ghost data sequence as the client-visible model and cs as a private refinement checked by Valid (16.0.2). Append must preserve both the model extension and the refinement, regardless of how the module hides cs (16.0.4).
Implementer: Establish Valid in the constructor and require and restore it around every mutating method. For Append, maintain Valid together with data=old(data)+d[..i], using the one-character hash recurrence at each iteration.

### §16.1 — Tokenizer
`contracts, specification-design, termination, representation-invariants, loops, objects-dynamic-frames` · structures: Tokenizer objects, strings, character sequences, token categories, source intervals

Error states:
- Tokenizer advances n beyond the end of source, violating its object invariant
- Read returns Whitespace instead of discarding the whitespace prefix
- Read returns End when p is not the end of source, or reaches end of source without returning End
- returned token differs from source[p..n] or contains a character outside its reported category
- Read stops while the next character still belongs to the same category, returning a non-maximal token

Laws:
- **Category partition** — `for every character ch, exactly one cat in {Identifier,Number,Operator,Whitespace,Error} satisfies Is(ch,cat)`
  - falsifier: exhibit ch accepted by zero categories or by two distinct categories
- **Category-recursion descent** — `rank(Error)=1 and rank(cat)=0 for cat!=Error; every recursive call made by Is(ch,Error) targets a cat with smaller rank`
  - falsifier: exhibit a recursive Is edge cat->cat2 with rank(cat2) >= rank(cat)
- **Tokenizer validity** — `Valid(t) <=> 0 <= t.n <= len(t.source)`
  - falsifier: exhibit t with Valid(t) and t.n outside [0,len(source)]
- **Whitespace and terminal boundaries** — `n0 <= p <= n1 <= N and (forall i with n0<=i<p: Is(source[i],Whitespace)) and cat!=Whitespace and (cat=End <=> p=N) and ((cat=End or cat=Error) <=> p=n1)`
  - falsifier: exhibit a Read result violating a bound, containing non-whitespace before p, returning Whitespace, or disagreeing with either terminal equivalence
- **Exact maximal token** — `token=source[p:n1] and, if p<n1, then (forall i with p<=i<n1: Is(source[i],cat)) and (n1=N or not Is(source[n1],cat))`
  - falsifier: exhibit a nonempty returned token unequal to source[p:n1], containing a wrongly categorized character, or ending before another character of cat

Breaker: Treat the long Read postcondition in 16.1.2 as a packet of independently falsifiable boundary laws. Include empty input, whitespace-only input, Error, End, and a token followed by another character of the same category.
Implementer: Keep 0<=n<=|source| as the object invariant. Use one loop to establish the skipped-whitespace interval, choose the category at p, and use a second always-style loop to establish the token interval and maximal stopping condition.

### §16.2 — Simple Aggregate Objects
`contracts, specification-design, abstraction-modules, representation-invariants, mutation-frames, objects-dynamic-frames` · structures: CoffeeMaker object graph, Grinder objects, WaterTank objects, Cup objects, representation sets, sets of object references

Error states:
- CoffeeMaker.Valid reads grinder or tank state not covered by its read frame — Valid changes after a supposedly irrelevant heap update
- Restock or Dispense writes a constituent object absent from Repr, escaping the aggregate's advertised frame
- constructor places an old aliased object in Repr while promising fresh(Repr), letting a new aggregate claim authority over caller-owned state
- method adds a pre-existing undeclared object to Repr while promising that all new representation members are fresh
- ChangeGrinder allocates a replacement but omits it from Repr, so the valid aggregate later mutates an object outside its frame

Laws:
- **Simple representation closure** — `Valid(cm) => cm in cm.Repr and cm.g in cm.Repr and Valid(cm.g) and cm.w in cm.Repr and Valid(cm.w)`
  - falsifier: exhibit valid cm missing itself or a constituent from Repr, or containing an invalid constituent
- **Aggregate read stability** — `Agree(H,H',{cm} union cm.Repr) => Valid_H(cm)=Valid_H'(cm); when Valid(cm), Agree(H,H',cm.Repr) => Ready_H(cm)=Ready_H'(cm)`
  - falsifier: exhibit heaps agreeing on the stated frame with different Valid or Ready results
- **Fresh construction** — `constructor(cm) => Valid(cm) and fresh(cm.Repr)`
  - falsifier: exhibit constructed cm with not Valid(cm) or some o in cm.Repr already allocated before construction
- **Standard mutator protocol** — `Valid_pre(cm) => Valid_post(cm) and ChangedExisting(H,H') subseteq pre(cm.Repr) and fresh(post(cm.Repr)-pre(cm.Repr))`
  - falsifier: exhibit a mutator that invalidates cm, changes an existing object outside pre(Repr), or adds a nonfresh object to Repr
- **Declared capture exception** — `InstallCustomGrinder(cm,g) => fresh(post(cm.Repr)-pre(cm.Repr)-{g})`
  - falsifier: exhibit an old object o added to Repr with o!=g and o notin pre(Repr)

Breaker: Make Repr observable only as the aggregate's abstract authority set, then test closure, frame confinement, and freshness. Sections 16.2.2 and 16.2.5 distinguish standard fresh growth from the explicit capture of a client-supplied constituent.
Implementer: Define Valid with reads this,Repr and order membership checks before constituent Valid calls. Constructors establish fresh(Repr); mutators preserve Valid and promise that newly added representation objects are fresh, with explicit exclusions for captured parameters.

### §16.3 — Full Aggregate Objects
`contracts, specification-design, representation-invariants, mutation-frames, objects-dynamic-frames, proof-mechanics` · structures: nested aggregate object graphs, CoffeeMaker objects, Grinder aggregates, WaterTank aggregates, nested representation sets

Error states:
- grinder and water-tank representation sets overlap — AddBeans modifies shared state and invalidates the water tank
- CoffeeMaker itself belongs to a child's Repr — a child method can change the owner's fields and smash the owner's invariant
- child Repr expands after a call but CoffeeMaker.Repr is not expanded, breaking the required subset relation and future frame confinement
- constructor's final Repr omits part of a child's representation set, so the parent does not own its full implementation graph
- validity predicate hides that every valid object belongs to its own Repr, preventing parent closure from accounting for the constituent object itself

Laws:
- **Exposed self-membership** — `Valid(o) => o in o.Repr for every aggregate object o`
  - falsifier: exhibit valid o with o notin o.Repr
- **Nested representation closure** — `Valid(cm) => cm in R and g in R and Rg subseteq R and cm notin Rg and Valid(g) and w in R and Rw subseteq R and cm notin Rw and Valid(w), where R=cm.Repr, Rg=g.Repr, and Rw=w.Repr`
  - falsifier: exhibit valid cm violating any containment, owner-exclusion, or constituent-validity conjunct
- **Sibling separation** — `Valid(cm) => g.Repr intersect w.Repr = {}`
  - falsifier: exhibit valid cm and object o with o in g.Repr and o in w.Repr
- **Disjoint-frame noninterference** — `ChangedExisting(H,H') subseteq g.Repr and g.Repr intersect w.Repr={} => Valid_H(w)=Valid_H'(w)`
  - falsifier: exhibit a g-framed update over disjoint representations that changes the truth of w.Valid()
- **Parent-frame refresh** — `after constituent calls, post(cm.Repr)=pre(cm.Repr) union post(g.Repr) union post(w.Repr), which implies post(g.Repr) subseteq post(cm.Repr) and post(w.Repr) subseteq post(cm.Repr)`
  - falsifier: exhibit a post-state with an object in a child's Repr but not in cm.Repr

Breaker: Attack nested aggregates through overlap, owner capture, and child-frame growth. The separation and subset laws in 16.3.3 are what justify sequential calls on independent constituents.
Implementer: Construct the full parent frame only after child frames are available, using locals in the first constructor phase or assigning after new; (16.3.2). After any child may expand its Repr, union the updated child sets back into the parent's Repr.

### §16.4 — Summary
`contracts, specification-design, representation-invariants, mutation-frames, objects-dynamic-frames` · structures: aggregate object graphs, representation sets, simple constituents, dynamic-frame constituents

Error states:
- Valid is true while this is absent from Repr, so the object's own fields are outside its advertised frame
- two simple constituents alias or dynamic constituent frames overlap, allowing one operation to invalidate another constituent
- constructor returns a representation set containing an object allocated before construction
- mutating method preserves its result but changes an existing object outside pre(Repr) or adds an old object to Repr
- function reads mutable state outside Repr, so its value changes while its declared frame is unchanged

Laws:
- **Canonical validity shape** — `Valid(o) => o in R; each simple constituent a satisfies a in R and Valid(a); each dynamic constituent b satisfies b in R and b.Repr subseteq R and o notin b.Repr and Valid(b); distinct constituent representations are pairwise disjoint, where R=o.Repr`
  - falsifier: exhibit valid o violating self-membership, constituent closure, owner exclusion, validity, or pairwise separation
- **Constructor protocol** — `post(Valid(o)) and fresh(post(o.Repr))`
  - falsifier: exhibit a constructed o that is invalid or has a nonfresh representation member
- **Function frame law** — `Valid(o) and Agree(H,H',o.Repr) => F_H(o,x)=F_H'(o,x)`
  - falsifier: exhibit valid o and heaps agreeing on Repr with different F results
- **Mutating-method protocol** — `Valid_pre(o) => Valid_post(o) and ChangedExisting(H,H') subseteq pre(o.Repr) and fresh(post(o.Repr)-pre(o.Repr))`
  - falsifier: exhibit a valid call that returns invalid, changes an existing object outside pre(Repr), or adds a nonfresh representation member

Breaker: Use 16.4 as the canonical dynamic-frame checklist: closure and separation in Valid, fresh construction, Repr-bounded reads and writes, and fresh representation growth. A deviation needs an explicit alternative contract.
Implementer: Instantiate the idiom mechanically, then strengthen it only for the class's actual topology. Keep Valid as reads this,Repr, establish the complete frame after constructor phase one, and restore closure whenever a child frame grows.

### §17.0 — Lazily Initialized Arrays
`contracts, algebraic-laws, abstraction-modules, representation-invariants, arrays-search, mutation-frames, objects-dynamic-frames, lemmas-proofs` · structures: backing arrays a, b, and c, ghost sequence Elements, initialized-index set s, heap representation set Repr

Error states:
- Update writes c[n] when n == N, causing an out-of-bounds failure on a full logical array.
- Get treats an uninitialized b[i] value as initialized, returns a[i] instead of default, or misses a previously updated value.
- Update changes Elements at the wrong index or changes a second index, so the concrete arrays and ghost sequence disagree.
- Two LazyArray instances share backing storage, so updating one changes the other's Get result.

Laws:
- **Abstract read** — `For valid A and 0 <= i < N_A, Get_A(i) == Elements_A[i], where N_A == |Elements_A|.`
  - falsifier: exhibit valid A and i with Get_A(i) != Elements_A[i]
- **Functional update** — `After Update_A(i,x), Elements_after == Elements_before[i := x], and for every j != i, Elements_after[j] == Elements_before[j].`
  - falsifier: exhibit valid A, i, j, and x with j != i and Elements_after[j] != Elements_before[j]
- **Reverse-index cardinality** — `Init_A(i) == (0 <= b_A[i] < n_A && c_A[b_A[i]] == i); s_A == {i | 0 <= i < N_A && Init_A(i)}; n_A == |s_A|.`
  - falsifier: exhibit a valid A and i with Init_A(i) != (0 <= b_A[i] < n_A && c_A[b_A[i]] == i), or with n_A != |s_A|
- **There is room** — `Valid(A) && 0 <= i < N_A && !Init_A(i) ==> n_A < N_A.`
  - falsifier: exhibit valid A and i with 0 <= i < N_A, !Init_A(i), and n_A == N_A
- **Finite prefix cardinality** — `Upto(k) == {j | 0 <= j < k} and |Upto(k)| == k for every natural k.`
  - falsifier: exhibit k with Upto(k) != {j | 0 <= j < k} or |Upto(k)| != k
- **Fresh representation isolation** — `Repr_A !! Repr_B ==> Update_A(i,x) leaves Elements_B unchanged, where !! means set disjointness.`
  - falsifier: exhibit disjoint valid A and B where Update_A(i,x) changes Elements_B

Breaker: Use the contracts from 17.0.0, the reverse-index invariant from 17.0.3-17.0.4, and the room/cardinality proof from 17.0.6 as red-test targets.
Implementer: Maintain immutable N and Repr from 17.0.2 and the central Elements-to-storage invariant from 17.0.4. Discharge the full-array boundary with Upto, SetCardinalities, and ThereIsRoom from 17.0.6.

### §17.1 — Extensible Array
`contracts, specification-design, abstraction-modules, representation-invariants, arrays-search, mutation-frames, objects-dynamic-frames, termination` · structures: fixed-length front arrays of length 256, ExtensibleArray depot of arrays, ghost sequence Elements, heap representation sets

Error states:
- Append leaves front full at length == M + 256 instead of moving it into the depot, breaking the boundary invariant.
- Get or Update uses the wrong depot array or wrong quotient/remainder index, returning or changing the wrong element.
- Append increments length but does not append exactly one element to Elements, losing or duplicating values.
- front or two depot arrays alias, so an update through one logical position corrupts another position.
- Recursive Get or Append does not descend to a smaller representation or sequence measure, causing nontermination.

Laws:
- **Depot/front boundary** — `M == (if depot == null then 0 else 256 * |depot.Elements|) && M <= length && length < M + 256 && (length == M <=> front == null).`
  - falsifier: exhibit a valid-looking state with length == M + 256, or length == M and front != null
- **Storage projection** — `For 0 <= i < M, Elements[i] == depot.Elements[i / 256][i % 256]; for M <= i < length, Elements[i] == front[i - M], where / is integer division.`
  - falsifier: exhibit i in range with Elements[i] != depot.Elements[i / 256][i % 256] or Elements[i] != front[i - M]
- **Append preservation** — `After Append(t), Elements_after == Elements_before + [t] and length_after == length_before + 1.`
  - falsifier: exhibit valid A and t with Elements_after != Elements_before + [t]
- **Functional update** — `After Update(i,t), Elements_after == Elements_before[i := t], with every other index unchanged.`
  - falsifier: exhibit valid A, i, j, and t with j != i and Elements_after[j] != Elements_before[j]
- **Representation separation** — `Every depot array is in Repr but outside depot.Repr, is distinct from front, and is distinct from every other depot array.`
  - falsifier: exhibit a state with front == depot.Elements[j] or depot.Elements[j] == depot.Elements[k] for j != k
- **Recursive descent measure** — `For recursive Get, depot.Repr < Repr; for recursive Append, |depot.Elements| < |this.Elements|, where < is strict subset or strict integer decrease.`
  - falsifier: exhibit a recursive call whose selected measure is not strictly smaller

Breaker: Use the contract from 17.1.0 and the partition, aliasing, and full-front invariants from 17.1.1-17.1.3 as the red-test oracle.
Implementer: Make the null/full boundary decisions explicit in the invariant from 17.1.1-17.1.2. Implement the depot projection first, flush exactly at 256 elements, and supply the sequence-size decrease for Append from 17.1.3.

### §17.2 — Binary Search Tree for a Map
`contracts, inductive-data, algebraic-laws, abstraction-modules, representation-invariants, objects-dynamic-frames, mutation-frames, termination, lemmas-proofs` · structures: binary-search-tree nodes, maps from int to Data, Option<Data>, heap representation sets

Error states:
- Lookup returns None for a present key, Some for an absent key, or the wrong value for a present key.
- Add replaces the requested key but drops unrelated map entries or stores the new key in a subtree that search cannot reach.
- A left key is not less than the node key or a right key is not greater, so later binary search skips an existing entry.
- Remove on a root with two children loses a subtree, chooses the wrong successor, or returns null for a nonempty result map.
- Child representations alias or contain the parent, or recursive Add/Remove fails to descend and does not terminate.

Laws:
- **Node map abstraction** — `For valid node n, M_n == Union(Union(map[n.key := n.value], left_n), right_n), where Union(m,null) == m and Union(m,q) == m + M_q.`
  - falsifier: exhibit valid n with M_n missing a child entry, containing an extra entry, or assigning the wrong value
- **Binary-search ordering** — `Every l in M_left.Keys satisfies l < n.key, and every r in M_right.Keys satisfies n.key < r.`
  - falsifier: exhibit a valid-looking node with l in M_left.Keys and l >= n.key, or r in M_right.Keys and n.key >= r
- **Lookup correctness** — `key in M.Keys ==> Lookup(key) == Some(M[key]); key !in M.Keys ==> Lookup(key) == None.`
  - falsifier: exhibit a valid tree and key violating either branch
- **Add map update** — `After Add(key,value), M_after == M_before[key := value].`
  - falsifier: exhibit a valid tree where an unrelated map entry changes or the requested entry is absent or wrong
- **Remove map update** — `For newMap == old(M) - {key}, Remove(key) returns null iff |newMap.Keys| == 0, otherwise returns n != null with n.M == newMap.`
  - falsifier: exhibit a valid tree where the returned map differs from old(M) - {key} or null is returned for a nonempty result
- **Minimum witness** — `Min() == (k,val) implies k in M.Keys, M[k] == val, and forall k' in M.Keys, k <= k'.`
  - falsifier: exhibit a valid nonempty tree whose Min() key is absent, has the wrong value, or exceeds another key
- **Union cardinality** — `For u == Union(m,n), m.Keys <= u.Keys and therefore |m.Keys| <= |u.Keys|.`
  - falsifier: exhibit m,n with a key in m.Keys absent from u.Keys or with |m.Keys| > |u.Keys|
- **Representation descent** — `For each non-null child c of node n, c.Repr < n.Repr; left.Repr !! right.Repr and n !in c.Repr, where < is strict subset.`
  - falsifier: exhibit a child with the same representation set as its parent, overlapping sibling representation, or the parent in the child representation

Breaker: Use 17.2.0, 17.2.2, and 17.2.4 to test map preservation, ordering, deletion surgery, representation separation, and recursive descent.
Implementer: Build the Node.Valid invariant before the recursive methods. Use Repr as the explicit decreases metric, and prove Remove's empty-result obligation through Union's key-subset and cardinality lemmas.

### §17.3 — Iterator for the Map
`contracts, inductive-data, representation-invariants, objects-dynamic-frames, mutation-frames, loops, termination, lemmas-proofs` · structures: BinarySearchTree map, immutable List<Node<Data>> stack, RemainingKeys set, heap representation sets

Error states:
- GetNext returns a key twice, returns a key not in the container, or silently omits a pending key.
- GetNext returns None while RemainingKeys is nonempty, or returns Some when no key remains.
- GetNext returns the right key with a value different from bst.M[key].
- GetNext mutates an object in bst.Repr or an iterator remains usable after the container representation changes.
- Push or GetNext loses a right subtree from the stack, violates SValid, or loops without consuming pending work.

Laws:
- **Exact key consumption** — `At construction R0 == bst.M.Keys; while bst is unchanged, R0 == ReturnedKeys + RemainingKeys and ReturnedKeys !! RemainingKeys.`
  - falsifier: exhibit an iterator state with a returned key still in RemainingKeys, or with a key in R0 in neither set
- **Option exhaustion** — `GetNext() == None <=> old(RemainingKeys) == {}; GetNext() == Some((k,v)) => k in old(RemainingKeys).`
  - falsifier: exhibit a valid iterator with old(RemainingKeys) nonempty and result None, or with result Some(k,v) and k not pending
- **Returned value soundness** — `GetNext() == Some((k,v)) ==> v == bst.M[k].`
  - falsifier: exhibit a valid iterator returning Some(k,v) with v != bst.M[k]
- **Pending-set transition** — `For Some((k,v)), RemainingKeys_after == RemainingKeys_before - {k}; for None, RemainingKeys_after == RemainingKeys_before == {}.`
  - falsifier: exhibit a call that removes more than k, removes no k, or changes RemainingKeys on None
- **Stack representation** — `SValid(Nil,R) <=> R == {}; for Cons(node,next), m == Union(map[node.key := node.value], node.right), m.Keys <= R, and SValid(next,R - m.Keys).`
  - falsifier: exhibit SValid(stack,R) with Nil and R nonempty, or with a Cons whose represented keys are not contained in R
- **Iterator frame and invalidation** — `writes(GetNext) <= Repr - bst.Repr; bst.Repr_after != bst.Repr_before means prior iterator Valid need not hold.`
  - falsifier: exhibit GetNext changing bst.Repr, or a container mutation after which the old iterator still claims Valid without revalidation
- **Push postcondition** — `After Push(nn), RemainingKeys_after == RemainingKeys_before + (if nn == null then {} else nn.M.Keys), with disjoint operands.`
  - falsifier: exhibit Push that omits a key from nn.M.Keys, adds a duplicate, or changes an old pending key
- **Loop progress** — `Each non-null Push iteration sets S_after == S_before - m.Keys with m.Keys != {}, hence S_after < S_before.`
  - falsifier: exhibit a loop iteration with m.Keys == {} or S_after not a strict subset of S_before

Breaker: Turn the contracts in 17.3.0 and the stack/progress invariants in 17.3.3-17.3.6 into exactness, invalidation, and no-duplicate tests.
Implementer: Represent remaining work with immutable List in 17.3.2, preserve SValid while pushing and popping, and use the decreasing ghost set S from 17.3.4 to discharge the loop.

### §17.4 — Summary
`contracts, abstraction-modules, representation-invariants, mutation-frames, objects-dynamic-frames` · structures: heap-allocated aggregate objects, representation sets, iterators over maps

Error states:
- A client method returns the promised abstract result but leaves Valid() false, so later clients rely on a broken representation.
- A callee writes outside the caller's declared representation frame, corrupting an unrelated aggregate.
- A container mutation leaves an outstanding iterator apparently valid even though its cached traversal state is stale.

Laws:
- **Validity preservation** — `Valid_before && Pre_call ==> Valid_after for every client-facing method.`
  - falsifier: exhibit a valid receiver and permitted call with Valid_after == false
- **Representation frame** — `writes(call) <= Repr(receiver), or writes(GetNext) <= Repr(iterator) - Repr(container).`
  - falsifier: exhibit a permitted call that changes an object outside its declared frame
- **Dependent iterator invalidation** — `Repr(container)_after != Repr(container)_before ==> prior Iterator.Valid need not hold.`
  - falsifier: exhibit a changed container representation with an old iterator still accepted as valid

Breaker: Use the summary's common Valid and Repr rules as cross-case oracles for postcondition preservation and heap isolation.
Implementer: Treat Valid as the client boundary and Repr as the aggregate ownership boundary. Preserve dependent-object assumptions explicitly when dynamic frames overlap.

### §A.2 — Expressions
`algebraic-laws, specification-design, arrays-search` · structures: sets, multisets, sequences, maps, arrays

Error states:
- Map merge gives priority to the left operand, so updating an existing key leaves the old value.
- A sequence update changes an index other than the target or uses the wrong slice endpoint.
- An array or sequence slice includes one extra element or omits the upper boundary, breaking a range-based search.
- Set, multiset, or sequence union/difference uses the wrong membership, multiplicity, or concatenation semantics.

Laws:
- **Set union and difference** — `x in (A + B) <=> (x in A || x in B), and x in (A - B) <=> (x in A && x !in B), for sets A,B.`
  - falsifier: exhibit A,B,x violating either membership equivalence
- **Right-priority map merge** — `For u == m + n, u.Keys == m.Keys + n.Keys and u[k] == n[k] if k in n.Keys, otherwise u[k] == m[k].`
  - falsifier: exhibit maps m,n with k in n.Keys and (m + n)[k] != n[k]
- **Sequence update and slice length** — `E[i := v][i] == v; j != i ==> E[i := v][j] == E[j]; |E[lo..hi]| == hi - lo.`
  - falsifier: exhibit E,i,j,v,lo,hi violating target preservation, non-target preservation, or slice length
- **Array-to-sequence projection** — `For array E, E[..] == E[0..E.Length] and |E[..]| == E.Length.`
  - falsifier: exhibit an array E where E[..] omits, duplicates, or reorders an element

Breaker: Retain the operator semantics needed by the Chapter 17 contracts; A.0-A.1 declaration and statement syntax is not part of the catalog.
Implementer: Use these collection equations as the shared meaning of map updates, sequence abstraction fields, and array range projections.

### §B.0 — Boolean Values and Negation
`algebraic-laws, assertions, proof-mechanics`

Error states:
- Negation maps true to true or false to false, so a guard's branch condition is inverted incorrectly.
- Double negation changes a predicate, causing a proof or assertion to accept the opposite state.
- The implementation treats false and !true as different boolean values.

Laws:
- **Negation of true** — `!true == false.`
  - falsifier: exhibit evaluation of !true != false
- **Double negation** — `!!X == X for every boolean expression X.`
  - falsifier: exhibit boolean X with !!X != X
- **False as negated true** — `true == !false.`
  - falsifier: exhibit a boolean evaluation where !false != true

Breaker: Use the three negation identities as primitive assertion oracles before testing larger Boolean formulas.
Implementer: Normalize nested negation and replace !true or !false immediately when discharging Boolean proof obligations.

### §B.1 — Conjunction
`algebraic-laws, assertions, proof-mechanics`

Error states:
- A conjunction passes when only one required condition is true, behaving like disjunction.
- A compound conjunction changes value when operands are reordered or regrouped.
- A contradiction X && !X evaluates true, allowing an impossible branch to execute.
- A negated conjunction is distributed incorrectly, accepting a state where only part of the required formula holds.

Laws:
- **Unit and zero** — `true && X == X, and false && X == false.`
  - falsifier: exhibit boolean X violating either identity
- **Semilattice laws** — `X && X == X; X && Y == Y && X; X && (Y && Z) == (X && Y) && Z.`
  - falsifier: exhibit booleans X,Y,Z violating idempotence, commutativity, or associativity
- **Distribution** — `!(X && !(Y && Z)) == (!(X && !Y) && !(X && !Z)).`
  - falsifier: exhibit booleans X,Y,Z with unequal sides
- **Law of contradiction** — `X && !X == false.`
  - falsifier: exhibit boolean X with X && !X != false

Breaker: Use unit, zero, semilattice, distribution, and contradiction laws to catch incorrect Boolean guards and invariant conjunctions.
Implementer: Simplify conjunctions with units and zeros, regroup freely only for Boolean value proofs, and use contradiction to close impossible branches.

### §B.2 — Predicates and Well-Definedness
`assertions, specification-design, proof-mechanics`

Error states:
- A guard evaluates a division, array index, or dereference on the right even though a left short-circuit condition should have prevented it.
- A logically equivalent reordering of a conjunction is accepted even though the reordered expression can divide by zero or dereference null.
- A verifier proves the Boolean value of a formula without proving that every evaluated operand is defined.

Laws:
- **Short-circuit well-definedness** — `WD(X && Y) == WD(X) && (!Val(X) || WD(Y)); WD(X || Y) == WD(X) && (Val(X) || WD(Y)); WD(X ==> Y) == WD(X) && (!Val(X) || WD(Y)), where WD means well-defined and Val is the Boolean value when defined.`
  - falsifier: exhibit d == 0, X == (100 <= d), and Y == (a == c / d): WD(X && Y) holds but WD(Y && X) fails
- **Value commutativity under definition** — `If WD(X && Y) && WD(Y && X), then Val(X && Y) == Val(Y && X), but well-definedness may differ.`
  - falsifier: exhibit expressions X,Y whose Boolean values commute but one operand order is undefined
- **Guard-before-dependent-expression** — `X && Y is safe only when WD(X) and (!Val(X) || WD(Y)); the left operand must establish Y's definedness when X is true.`
  - falsifier: exhibit a false guard followed by an evaluated division-by-zero, null dereference, or out-of-range index

Breaker: Make definedness part of the red test: Boolean equivalence alone does not justify reordering short-circuit predicates.
Implementer: Place range, non-null, and nonzero guards before dependent expressions, and discharge WD obligations in left-to-right order.

### §B.3 — Disjunction and Proof Format
`algebraic-laws, assertions, proof-mechanics`

Error states:
- A disjunction evaluates false when one operand is true, or true when both operands are false.
- A De Morgan or distribution step changes a guard's truth value.
- A proof calculation reaches a final expression using a step that is not an equality, so the claimed theorem is unsound.
- A disjunction is grouped incorrectly and changes the result of a nested guard.

Laws:
- **De Morgan** — `!(X || Y) == (!X && !Y), and X || Y == !(!X && !Y).`
  - falsifier: exhibit booleans X,Y with either De Morgan equality false
- **Unit, zero, and semilattice laws** — `false || X == X; true || X == true; X || X == X; X || Y == Y || X; X || (Y || Z) == (X || Y) || Z.`
  - falsifier: exhibit booleans X,Y,Z violating one identity
- **Disjunction distribution** — `X || (Y && Z) == (X || Y) && (X || Z); X && (Y || Z) == (X && Y) || (X && Z).`
  - falsifier: exhibit booleans X,Y,Z with unequal sides
- **Excluded middle** — `X || !X == true.`
  - falsifier: exhibit boolean X with X || !X != true
- **Proof-calculation transitivity** — `E0 == E1 && E1 == E2 ==> E0 == E2; an annotated equality chain preserves the endpoint value.`
  - falsifier: exhibit a calculation containing a step E_i != E_(i+1) while claiming E0 == En

Breaker: Use the Boolean identities as algebraic red tests and require every proof-calculation step to preserve equality.
Implementer: Rewrite disjunctions with De Morgan or distribution when useful, then annotate each equality step with the law that justifies it.

### §B.4 — Implication
`contracts, assertions, algebraic-laws, specification-design, proof-mechanics`

Error states:
- An implication is implemented as conjunction, so a false antecedent incorrectly makes the formula false.
- A contract accepts a postcondition without its precondition, or uses the contrapositive in the wrong direction.
- Shunting a premise across implication changes a required guard and admits an invalid state.
- Right-associative implication is parsed as left-associative, changing a chained proof obligation.

Laws:
- **Implication definition** — `X ==> Y == !X || Y.`
  - falsifier: exhibit booleans X,Y with (X ==> Y) != (!X || Y)
- **Modus ponens** — `X && (X ==> Y) == X && Y.`
  - falsifier: exhibit booleans X,Y violating the equality
- **Contrapositive** — `X ==> Y == (!Y ==> !X).`
  - falsifier: exhibit booleans X,Y with unequal implications
- **Shunting** — `(X && Y) ==> Z == X ==> (!Y || Z).`
  - falsifier: exhibit booleans X,Y,Z with unequal sides
- **Implication distribution** — `(X || Y) ==> Z == (X ==> Z) && (Y ==> Z).`
  - falsifier: exhibit booleans X,Y,Z violating the distribution equality

Breaker: Turn implication definitions, contraposition, shunting, and distribution into tests for contract direction and guard movement.
Implementer: Read X ==> Y as 'assuming X, establish Y'; use the definition or shunting only after checking the operator precedence and direction.

### §B.5 — Proving Implications
`lemmas-proofs, proof-mechanics, algebraic-laws, assertions`

Error states:
- A proof claims X ==> X without establishing the Boolean tautology, so a reflexive obligation remains unsolved.
- A transitive proof uses X ==> Y and Y ==> Z but concludes the reverse direction or skips one premise.
- A proof treats an assumed antecedent as if it were already the consequent, accepting an invalid invariant or postcondition.
- A proof calculation contains a non-equality step but reports the endpoint as established.

Laws:
- **Reflexivity** — `X ==> X == true.`
  - falsifier: exhibit boolean X with X ==> X != true
- **Implication transitivity** — `((X ==> Y) && (Y ==> Z)) ==> (X ==> Z) == true.`
  - falsifier: exhibit boolean X,Y,Z where both premises hold but X ==> Z is false
- **Antecedent discharge pattern** — `To establish A ==> B, assume A and derive B; equivalently, A && (A ==> B) == A && B.`
  - falsifier: exhibit a purported proof of A ==> B that has A true but B false

Breaker: Use reflexivity and transitivity as theorem-level tests, and reject proofs that do not explicitly establish the consequent under the antecedent.
Implementer: For a large implication, assume its antecedent and simplify from that context; for chains, prove each arrow and compose them.

### §B.6 — Free Variables and Substitution
`algebraic-laws, proof-mechanics, specification-design`

Error states:
- Substitution replaces a bound occurrence, changing the scope of a quantifier.
- A free variable in the replacement becomes captured by a quantifier in the target expression.
- Simultaneous substitutions are applied sequentially, so one replacement changes the input of another.
- Alpha-renaming a bound variable changes the formula's meaning instead of preserving it.

Laws:
- **Alpha-renaming** — `alpha(E,y,w) == E when w is fresh and only a bound variable y is renamed.`
  - falsifier: exhibit E and fresh w where alpha-renaming changes E's value
- **Free-occurrence substitution** — `(x < 100 && 20 <= Fib(y))[y := 2*x + y] == x < 100 && 20 <= Fib(2*x + y), with only free y replaced.`
  - falsifier: exhibit an expression where substitution changes a bound occurrence of y
- **Capture avoidance** — `(forall y :: P(x,y))[x := y] == forall w :: P(y,w), where w is fresh and w notin FV(y).`
  - falsifier: exhibit E == forall y :: P(x,y) where naive substitution yields forall y :: P(y,y) instead of alpha-renaming
- **Simultaneous substitution** — `(F(x) + G(y))[x,y := x + y, x - y] == F(x + y) + G(x - y).`
  - falsifier: exhibit replacements whose sequential application gives a result different from simultaneous substitution

Breaker: Test substitution on bound and free occurrences separately; capture and sequential replacement are correctness failures, not cosmetic differences.
Implementer: Alpha-rename binders before substitution, replace only free occurrences, and apply multi-variable substitutions simultaneously.

### §B.7 — Universal Quantification
`algebraic-laws, assertions, specification-design, arrays-search, proof-mechanics`

Error states:
- A universal assertion passes after checking one witness even though another value violates the predicate.
- The one-point rule substitutes the wrong value or leaves the quantified variable in the result.
- An unused variable is eliminated over an empty type, turning forall x :: true into an incorrect true claim.
- A bounded array or search invariant includes the wrong endpoint or omits the first or last element.

Laws:
- **Universal distribution** — `forall x :: (E && F) == (forall x :: E) && (forall x :: F).`
  - falsifier: exhibit predicates E,F and a domain where the two sides differ
- **Universal one-point rule** — `forall x :: (x == F ==> E) == E[x := F], provided x is not free in F.`
  - falsifier: exhibit E,F where the quantified formula differs from E[x := F]
- **Unused and constant variables** — `forall x :: E == E when x is not free in E and x's type is nonempty; forall x :: true == true.`
  - falsifier: exhibit an empty type for the first rule or a non-true result for the constant rule
- **Range decomposition** — `For m < n, forall i :: (m <= i < n ==> P(i)) == P(m) && (forall i :: (m + 1 <= i < n ==> P(i))).`
  - falsifier: exhibit m,n,P where the decomposition includes an extra index or omits an index

Breaker: Use universal laws to expose quantifier-range off-by-one errors and claims that validate only a witness instead of every element.
Implementer: Split bounded ranges at a concrete endpoint, apply the one-point rule when a range pins a variable, and preserve nonempty-type side conditions.

### §B.8 — Existential Quantification
`algebraic-laws, assertions, specification-design, arrays-search, proof-mechanics`

Error states:
- An existential assertion is true with no witness or false even though a valid witness satisfies the predicate.
- Negating a universal or existential condition produces the wrong quantifier or fails to negate the predicate.
- Factoring an independent condition out of an existential loses the witness-dependent condition.
- A bounded search existential includes the wrong endpoint or misses the only witness.

Laws:
- **Quantifier De Morgan** — `!(forall x :: P) == exists x :: !P; !(exists x :: P) == forall x :: !P.`
  - falsifier: exhibit a domain and predicate where either negation equality fails
- **Existential one-point rule** — `exists x :: (x == F && E) == E[x := F], provided x is not free in F.`
  - falsifier: exhibit E,F where the existential result differs from E[x := F]
- **Independent-condition extraction** — `exists x :: (E && F) == E && (exists x :: F), when x is not free in E and the type is nonempty.`
  - falsifier: exhibit E,F where factoring E changes the existential truth value
- **Unused and false existential** — `exists x :: E == E when x is not free in E and the type is nonempty; exists x :: false == false.`
  - falsifier: exhibit an empty type for the unused-variable rule or a result other than false for exists x :: false
- **Existential range decomposition** — `For m < n, exists i :: (m <= i < n && P(i)) == P(m) || (exists i :: (m + 1 <= i < n && P(i))).`
  - falsifier: exhibit m,n,P where the decomposition loses or invents a witness

Breaker: Use witness soundness, quantifier duality, and range decomposition to catch false positives, false negatives, and search-boundary defects.
Implementer: Provide an explicit witness for existential goals, use De Morgan to switch quantifiers safely, and split bounded searches without changing their endpoints.

# Effect Core v1 CLASSIFICATION — anchors in what the estate already computes

Date: 2026-08-31
Scope: `.staging/effect-core-v1/CLASSIFICATION.md` D0–D14, read against the landed
`PProg.envelope` sandwich in `library/cas/Cas/Lang/Defun.lean` and the prose ladder in
`library/cas/Cas/Lang/Fragments.lean`.
Kernel companion: `.staging/agent-reports/2026-08-31-effect-core-classification-anchors.lean`
(compiles; output pasted in §17).

Every anchor below was checked by reading the definition, not the name.

---

## 0. Summary table

| Dim | Anchor (path:LINE) | Verdict | Exactness at the straight-line rung |
| --- | --- | --- | --- |
| D0 `AERDomain` | `Cas/Lang/Sig.lean:12` (`Sig`), `Cas/Lang/Ops.lean:26` (`CasE.Ans`), `Cas/Lang/Sig.lean:18` (`Sig.sum`), `Cas/Lang/Interp.lean:184` (`Prog.handleLlm`) | PARTIAL | `A` exact, `R` exact — both as TYPES, not analyses. `E` has no carrier at all. |
| D1 `OpFootprintDomain` | `Cas/Lang/Defun.lean:1176` (`PProg.puts`), `:1170` (`PProg.reads`), `:1140` (`PLine.kind`) | LANDED (may set) | NOT exact. Refuted by GAP 1 (`Defun.lean:2135`). Must set proved only at the head line (`:2011`). |
| D2 `WorldFrameDomain` | `Cas/Lang/Defun.lean:1965` (`runP_frame_sound`), `:1944`, `:1887`, `:1868`; read trace `Cas/Lang/Auth.lean:117` | LANDED (frame condition) | NOT exact. GAP 1 + GAP 2 (`:2135`, `:2149`). Write ADDRESSES absent from the envelope (DIV-5). |
| D3 `ControlDomain` | `Cas/Lang/Fragments.lean` (whole file, prose); carriers `Defun.lean:187` / `Prog.lean:25`; flag `Defun.lean:1480` | PARTIAL | Exact but vacuous: the class is the term's TYPE, not a computed result. `selective` and `recursive` have no carrier. |
| D4 `DependenceDomain` | `Cas/Lang/Defun.lean:1193` (`PProg.dataflow`), `:1537` (`runPFrom_done_answers`), `:1496` (`PLine.hashDetermined`) | LANDED | EXACT on `done` runs; over-approximate past a refusal (`Defun.lean:1382-1384`). |
| D5 `ProgressDomain` | `Cas/Lang/Defun.lean:403` (`runP_halts`), `Cas/Lang/Wp.lean:242`, `:150`/`:154` (`wp`/`wlp`), `Cas/Lang/Interp.lean:58` | LANDED | **EXACT** — the only dimension where must = actual = may at L-A. |
| D6 `ChoiceDomain` | `Cas/Lang/Defun.lean:293` (`runP` is a function), `Cas/Lang/Handler.lean:279` (`replayHandler`), `Cas/Lang/Interp.lean:190` (`runAgent`), witness `Defun.lean:2190` | PARTIAL | Source set exact by construction; no `deterministicGiven` is computed. |
| D7 `ScopeDomain` | — | **NO ANCHOR** | n/a — no region, scope frame, or escape set exists. |
| D8 `ResourceDomain` | — | **NO ANCHOR** | n/a — zero occurrences of finalizer / acquire-release. |
| D9 `ResumptionDomain` | `Cas/Lang/Prog.lean:26` (`Prog.vis`), `Cas/Lang/Ops.lean:29` (`fail ↦ Empty`), `Defun.lean:1537` | PARTIAL | EXACT: one answer per line, proved. `many` refused by the carrier, `zero` refused by type. |
| D10 `TemporalDomain` | `Cas/Lang/Defun.lean:1887` (`runPFrom_append_done`) for `seq` only | PARTIAL | `seq`'s happens-before exact; everything concurrent has no anchor. |
| D11 `CancellationDomain` | — | **NO ANCHOR** | n/a — zero occurrences. |
| D12 `CauseDomain` | `Cas/Lang/Interp.lean:28` (`Refusal`), `Defun.lean:1720` (`absentAddr`), `:1766`, `:2101` | PARTIAL | NOT exact: exactly one of six refusal constructors is statically excludable (DIV-4). |
| D13 `ReificationDomain` | `Cas/Lang/Defun.lean:1480` (`PLine.HashDetermined`), `:1496`, `:2190`; `Ops.lean:43`; `Handler.lean:279`; `Mcp.lean:208` | PARTIAL | Grades landed as WITNESSES, not as a decidable function. See §14 and §16. |
| D14 `ObservationDomain` | `Cas/Lang/Representation.lean:134` (`ObsEq`), `:182`, `:198` | LANDED | The mask is exact and its blind spot is proved: refusal words are outside it (DIV-6). |
| D14 `ProvenanceDomain` | `H : Bytes → Addr32` (carried in every statement), `Cas/Backend/Mcp.lean:545` (`manifestVersion`), `Cas/Lang/Auth.lean` (trust boundary) | PARTIAL | The digest pin is explicit; no alphabet/compiler/host record exists in Lean. |

Divergences proved in Lean: **7** (DIV-1 and its corollary, DIV-2 … DIV-6, plus the D5
suspension exhibit). All compile with `[propext]` or no axioms; none uses `sorryAx`.

---

## 1. D0 — static Effect type (`AERDomain`)

**Anchor.** Split three ways, and only two of the three exist.

- `A` (answer type): `Sig.Ans : Op → Type` (`Cas/Lang/Sig.lean:14`), instantiated as
  `CasE.Ans` (`Cas/Lang/Ops.lean:26-29`). This is literally §3 D0's `answerTy op`, as a
  dependent function, LANDED. At L-A the whole table answers `Addr32`
  (`runP : … → Status CasSig Addr32 × Word`, `Cas/Lang/Defun.lean:293`).
- `R` (requirement row): `Sig.sum` (`Cas/Lang/Sig.lean:18`) IS `R_p ∪ R_k`, and
  `Handler.sum` (`Cas/Lang/Handler.lean:63`) plus `Prog.handleLlm : Prog AgentSig A →
  Prog CasSig A` (`Cas/Lang/Interp.lean:184`) IS `provide H p`'s `(R_p ∖ provides H) ∪
  requires H`. LANDED.
- `E` (typed error row): **no carrier.** `Sig` has exactly two fields, `Op` and `Ans`
  (`Cas/Lang/Sig.lean:12-14`); there is no per-operation error type anywhere. `Refusal`
  (`Cas/Lang/Interp.lean:28-34`) is one flat six-constructor sum shared by every
  operation, and its sixth arm is `failed (reason : String)` — untyped.

**Composition rule check.** `seq p k = (A_k, E_p ∪ E_k, R_p ∪ R_k)` agrees on `A`: the
table's designated result is the LAST answer (`runPFrom`'s `nil` case reads
`env.getLast?`, `Cas/Lang/Defun.lean:271-291`). It agrees on `R`: signature sum is
associative and commutative, and `R` is genuinely a set-like domain, so a union is right
here. `E` has nothing to compose.

**Exactness.** `A` and `R` are exact, but for a reason the classifier should not take
credit for: they are decided by the Lean typechecker on the term, not computed by an
analysis over a graph. `E` cannot be exact because it does not exist; and the envelope
cannot even give a useful `may-E` upper bound — DIV-4 (§13 below) exhibits a table with
empty reads and a closed dataflow that still refuses.

**One structural note the packet should absorb.** `CasE.Ans (.fail _) = Empty`
(`Cas/Lang/Ops.lean:29`) is the estate's only typed error fact, and it is stronger than an
error row: a refused program has no continuation *by type*. That is `ALGEBRA.md`'s
`Exit E A` failure branch, already landed, in the one place it costs nothing.

---

## 2. D1 — dynamic operation footprint (`OpFootprintDomain`)

**Anchor.** `PProg.puts : PProg → List PutShape` (`Cas/Lang/Defun.lean:1176`) and
`PProg.reads : PProg → List Addr32` (`:1170`), with `PLine.kind : PLine → PKind`
(`:1140`, over `PKind` at `:1134`) as the operation-ID projection. `PKind` already
`deriving DecidableEq`. The soundness theorem is `runPFrom_puts_sound`
(`:1618`) / `runP_puts_sound` (`:1672`). LANDED, for the may set.

**Composition rule check.** §5's `seq p k` row says the may footprint is a **union**. The
landed transfer is **list append**, and I proved both halves:

```
theorem reads_append (p q : PProg) : PProg.reads (p ++ q) = PProg.reads p ++ PProg.reads q
theorem puts_append  (p q : PProg) : PProg.puts  (p ++ q) = PProg.puts  p ++ PProg.puts  q
```

Append is not union: it is ordered and it keeps multiplicity. Both matter — see DIV-2
(§3) for order and DIV-3 (§3) for multiplicity. §2's own rule ("Only domains that
actually have a commutative join may call `choice` a join") is right; §5's table then
violates it by writing "union" in the `seq` column for a dimension whose landed carrier is
a list.

**Must set.** §5's "add only when block is must-reached" matches the landed scoping
exactly, and the landed note says so in the same words: necessity is stated per line, and
"for a line to be reached the run must not have refused earlier, which is precisely the
gap" (`Cas/Lang/Defun.lean:1985-1988`). The only unconditional lower bound in the estate is
`runP_head_load_necessary` (`:2011`) — one theorem, covering exactly the HEAD line. There
is no reachability predicate to discharge §5's side condition with.

**Exactness.** NOT exact. Witness: GAP 1, `Cas/Lang/Defun.lean:2135` — a table whose first
line loads an absent address refuses there, and the envelope still declares the put on line
two.

---

## 3. D2 — world frame and capability use (`WorldFrameDomain`)

**Anchor.** This is the dimension the estate has landed most completely.

- The frame condition itself: `runP_frame_sound` (`Cas/Lang/Defun.lean:1965`), built from
  `runPFrom_frame_sound` (`:1944`), `runPFrom_append_done` (`:1887`) and
  `PProg.answersFrom_prefix` (`:1868`). It holds for EVERY run, refusing ones included.
  `Fragments.lean`'s interop claim 1 is exactly this theorem.
- Per-operand: `PProg.resolve_sound` (`:1332`) and `PLine.touches` (`:1347`).
- At the observable: `runPFrom_absent_sound` (`:1766`) / `runP_absent_sound` (`:1839`).
- Lower bound: `runPFrom_load_absent` / `runPFrom_load_present` (`:1992`, `:2002`).
- The *dynamic* read footprint, as a recorded artifact: `proveHandler`
  (`Cas/Lang/Auth.lean:117`) records the LOAD trace onto a proof word — the concrete-side
  fact this domain's `gamma` would be stated against — with `whole_run_security`
  (`Auth.lean:678`) and `whole_run_correctness` (`Auth.lean:757`) as its pair.

**Composition rule check — DIVERGENCE PROVED (DIV-2).** §3 D2 says "Sequential composition
unions frames." A union is commutative; the estate's own observable is not.

```lean
theorem div2_world_seq_is_not_commutative :
    ∃ (p q : PProg),
      List.Perm (PProg.puts p) (PProg.puts q)
        ∧ (runP Hlen p []).2 ≠ (runP Hlen q []).2
        ∧ (runP Hlen p []).2.length = 2
        ∧ (runP Hlen q []).2.length = 2
```

Witness: `p = [put 0 0 [] [], put 0 0 [7] []]`, `q` the same two lines swapped. The put
multisets are permutation-equal; the words differ. A commutative `seq` at D2 therefore
identifies programs the estate's R5 observation separates. This is why
`runPFrom_puts_sound` concludes `List.Sublist` — an ordered relation — rather than `⊆`,
and it is load-bearing, not stylistic.

**Composition rule check — DIVERGENCE PROVED (DIV-3).** §5 gives ONE "may footprint" and
ONE "must footprint" column per flow form. The landed instance needs two, because the
operation footprint (D1) and the world delta (D2) come apart on a run that neither refuses
nor branches:

```lean
theorem div3_op_footprint_ne_world_footprint :
    ∃ (p : PProg),
      (runP Hlen p []).1.isDone = true            -- no refusal: §5's side condition met
        ∧ (runP Hlen p []).1.isRefused = false
        ∧ (PProg.answersFrom Hlen [] p).length = p.length   -- every line executed
        ∧ p.length = 2
        ∧ (PProg.puts p).length = 2               -- D1 must = 2 operations
        ∧ (runP Hlen p []).2.length = 1           -- D2 must = 1 world delta
```

This is `Defun.lean:2149`'s GAP 2 with both halves in one statement. `put`'s DUPLICATE
outcome performs the operation and appends no binding, so "must footprint" is ambiguous
between "the operation must occur" (2) and "the world must change" (1). §5's single
column cannot carry both.

**DIVERGENCE PROVED (DIV-5) — the write ADDRESSES are not in the envelope.** §3 D2's
carrier is "must/may reads, **writes**, allocations". The landed read half IS addresses
(`PProg.reads : PProg → List Addr32`); the write half is NOT
(`PProg.puts : PProg → List PutShape`, and `PutShape` — `Defun.lean:1155-1161` — carries
version, tag, payload and refKinds, with no address). The asymmetry is forced by the type:
an address is `H (encodeNode …)` and `PProg.envelope : PProg → Envelope` (`:1205`) takes no
`H`.

```lean
theorem div5_write_addresses_not_in_envelope :
    ∃ (p : PProg),
      (runP Hlen p []).2.map Binding.address ≠ (runP Hconst p []).2.map Binding.address
```

Consequence for the packet: a grant checked against the envelope bounds *what shape* is
written, never *where*. §5's `CAS injection` row ("may footprint = envelope upper bound")
is therefore true only in the shape register, and the row should say so.

**Parallel / independence.** NO ANCHOR. There is no `par`, no independence relation, and
no read/write commutation theorem anywhere in `library/cas`.

**Exactness.** NOT exact. Two witnesses, and `Fragments.lean` states there are no others:
GAP 1 (refusal suffix, `Defun.lean:2135`) and GAP 2 (duplicate outcome, `:2149`).
`DESIGN.md` §3.1's row "exact: `over = under = actual`" for L-A is refuted by those two,
and `Fragments.lean` names the refutation.

---

## 4. D3 — minimal control strength (`ControlDomain`)

**Anchor.** `Cas/Lang/Fragments.lean` — the whole file — is the ladder, but it is PROSE:
the module states "This module carries no definitions" and it is accurate. There is no
`ControlDomain` carrier, no `le`, no `seq`, no lattice.

What the estate has instead is stronger in one way and weaker in another: D3 is a
**carrier distinction, not an abstract domain**. `PProg` (`Cas/Lang/Defun.lean:187`) IS the
applicative rung and `Prog CasSig` (`Cas/Lang/Prog.lean:25`) IS the monadic rung; which one
a term inhabits is decided by its TYPE, and the inclusion is `embed` (`Defun.lean:231`)
with `runP_embed_agree` (`:362`) as the proved tie. §3 D3's requested "separate flag" for
the hash-determined fragment exists as `PLine.HashDetermined` (`:1480`), discharged for
every `CasSig` line by `PLine.hashDetermined` (`:1496`).

**Composition rule check.** Not applicable — a carrier distinction has no transfer
functions. The one composition fact is `Prog`'s `LawfulMonad` instance and `interpret_bind`
(`Cas/Lang/Handler.lean:53`), which is the `monadic` rung's own algebra.

**Exactness.** Exact and vacuous at L-A: any inhabitant of `PProg` is applicative-strength
because that is what `PProg` means. §3 D3's "the classifier returns the least syntactic
class it can justify" has no work to do until a single carrier spans more than one class.
`selective` has no carrier (Fragments.lean's L-S rung is PROPOSED, OWED). `recursive` has
no carrier either — `Prog.lean:17` records "There is no loop primitive."

---

## 5. D4 — answer dependence (`DependenceDomain`)

**Anchor.** `PProg.dataflow : PProg → List (Nat × Nat)` (`Cas/Lang/Defun.lean:1193`), over
`PProg.dataflowFrom` (`:1184`). The edge's meaning is proved, not asserted:
`PProg.answersFrom_cons_of` (`:1602`) says the history grows by exactly one entry per line
in program order, so entry `j` IS line `j`'s answer.

The edge LABEL §3 D4 asks for is landed too, and this is the dimension the classification
document already understands best: every L-A edge is `hashDetermined`, discharged by
`PLine.hashDetermined` (`:1496`) out of `putWord_answer` (`:1401`, Level 0, no premise on
`H`) and `PIn.resolve` (`:199`). `runPFrom_done_answers` (`:1537`) lifts it to whole runs:
given `H`, the entire answer environment is a pure recursion on the table. The
`foreignDetermined` label's counter-witness is `Defun.lean:2190` — one program, one word,
one `H`, two oracles, two answer histories.

**Composition rule check — DIVERGENCE PROVED (DIV-1).** §2 requires every `AbsDomain` to
carry a `seq`, and §5's `seq` column says "union". For this dimension a union — or even an
append — is **wrong, not merely imprecise**, because the landed carrier uses ABSOLUTE line
indices:

```lean
theorem div1_dataflow_seq_is_not_union :
    ∃ p q : PProg,
      PProg.dataflow (p ++ q) ≠ PProg.dataflow p ++ PProg.dataflow q
        ∧ PProg.dataflow (p ++ q) = [(1, 0)]
        ∧ PProg.dataflow p = []
        ∧ PProg.dataflow q = [(0, 0)]
```

Witness: `p = [put 0 0 [] []]`, `q = [load (ans 0)]`. The composite's edge is `(1,0)`; the
union of the operands' graphs is `{(0,0)}`. It names an edge the composite does not have
and misses the one it does. `seq` at D4 must re-index the right operand — which is exactly
what `dataflowFrom`'s explicit index accumulator is for, and the landed code says so
(`:1181-1183`: "Spelled with an explicit index accumulator rather than through
`List.zipIdx` so that the closure theorem below inducts along the same recursion").

Corollary, also proved: closure is not a `seq`-homomorphic property.

```lean
theorem div1_closure_not_seq_homomorphic :
    ∃ p q : PProg,
      (PProg.envelope q).dataflowClosed = false ∧ (PProg.envelope (p ++ q)).dataflowClosed = true
```

A right operand that is OPEN on its own becomes CLOSED in the composite. Any `seq` transfer
that joins the operands' closure bits would report the composite open and refuse a program
`runP_no_dangling` (`:2101`) proves safe.

**Exactness.** EXACT on `done` runs: `runPFrom_done_answers` gives
`(answersFrom H env p).length = p.length` — every line executed, nothing skipped. Over-
approximate elsewhere, in exactly one named place: `answersFrom` is store-free and "keeps
computing past a refusal a store would have raised" (`Defun.lean:1382-1384`). That is the
same GAP 1 seen from the dataflow side, and `Defun.lean:1127-1130` states it is the only one.

---

## 6. D5 — termination, divergence, and suspension (`ProgressDomain`)

**Anchor, and it is complete.** `runP_halts` (`Cas/Lang/Defun.lean:403`), out of
`runPFrom_halts` (`:375`): every table run reports a halted status, at every word, with no
fuel and no ranking. `runP_done_or_refused` (`Cas/Lang/Wp.lean:242`) is the two-valued
form. Suspension is a separate `Status` constructor — `Status.running`
(`Cas/Lang/Interp.lean:44`) with `Status.isRunning` (`:58`) as its discriminator — and
`run` reports it on fuel exhaustion (`Cas/Lang/Interp.lean:146-152`).

`wp` and `wlp` (`Cas/Lang/Wp.lean:150`, `:154`) are the total- and partial-correctness
transformers, i.e. this domain's lower and upper bounds, and they already satisfy §2's
monotonicity requirement (`wp_mono` `:308`, `wlp_mono` `:316`).

**Composition rule check.** §5's `feedback`/cycle row is vacuous at L-A. `wp_append`
(cited by `.staging/effect-core-v1/exhibits.lean`) is the landed sequential transfer, and
it carries a `pre ≠ []` side condition proved necessary — a detail §5's `seq` row does not
have.

**Exactness — the one dimension where it is achieved.** `mustTerminate = mayTerminate =
true` for every `PProg` at every word. §3 D5's requirement ("a well-founded ranking that
decreases across every reachable internal cycle") is discharged vacuously: `PProg` is a
list and `runPFrom` is structural on it.

**Exhibit, D5.** §3 D5's suspension/divergence split and `EC1-FC10` ("finite fuel
establishes termination") are already answered by the estate's own type:

```lean
theorem d5_fuel_exhaustion_is_suspension :
    ∃ (p : Prog CasSig Addr32),
      (run Hlen 0 p []).1.isRunning = true ∧ (run Hlen 2 p []).1.isRunning = false

theorem d5_no_suspension_at_LA (p : PProg) (w : Word) :
    (runP Hlen p w).1.isRunning = false := runP_halts Hlen p w
```

Out of fuel is a THIRD status, so no run report can be mistaken for a termination proof.
The word gate already tests `isRunning = false` as its precondition
(`Cas/Lang/Interp.lean:55-57`).

---

## 7. D6 — choice and determinism source (`ChoiceDomain`)

**Anchor.** No `ChoiceDomain` carrier, but every source §3 D6 lists that the estate can
have is present as a concrete instance:

- *input*: the starting `Word`, an explicit argument of `runP` (`Defun.lean:293`);
- *handler answer*: the store, via `putWord` / `Word.find`;
- *replay tape*: `replayHandler` (`Cas/Lang/Handler.lean:279`) — "the recorded word is the
  oracle", which is §3 D6's tape, landed;
- *foreign answer*: `runAgent` (`Cas/Lang/Interp.lean:190`) and `Prog.handleLlm` (`:184`),
  with the proved witness at `Defun.lean:2190`.

Absent: schedule, race tie, clock, random — no anchor, and no carrier that could have one.

**Composition rule check.** `deterministicGiven` is not computed anywhere; at L-A it is
definitional rather than derived, because `runP` is a total function of `(H, p, w)` and
Lean functions are deterministic. §6 reduction 6 ("`deterministicGiven = {input, tape,
schedule}` … permits deterministic executable replay") is, for the CAS fragment, already
discharged by that fact plus `runP_embed_agree` (`:362`).

**Exactness.** The source set is exact by construction — it is the argument list of the
runner. This is a real anchor but not a classification: nothing reads a program and reports
its sources.

---

## 8. D7 — scope topology (`ScopeDomain`)

**NO ANCHOR.** Searched `library/cas` for region, scope frame, handler-provision site, exit
coverage, escape set, daemon: nothing. The only "tower" in the library is the *service*
tower (`Cas/Lang/Tower.lean`, `Handler.through`), and `Fragments.lean` states explicitly
that it is VERTICAL ("what implements this?") and orthogonal to the horizontal fragment
ladder — it is not a region tree and must not be read as one.

**Exactness.** Not applicable. §3 D7's "acyclic nesting yields an exact finite region tree"
has nothing to be exact about here.

---

## 9. D8 — resource protocol (`ResourceDomain`)

**NO ANCHOR.** Zero occurrences of `finaliz*` or `acquireRelease` across every `.lean` file
in `library/cas`. There is no acquire/register/use/release protocol, no live-count, no
release-guarantee lattice, and no ordered finalizer abstraction.

**Exactness.** Not applicable. `EC1-FC08` ("acquire implies release") has no witness in the
estate to be checked against.

---

## 10. D9 — resumption (`ResumptionDomain`)

**Anchor, PARTIAL but the facts are exact.** `Prog.vis (op) (k : S.Ans op → Prog S A)`
(`Cas/Lang/Prog.lean:26`) is a one-shot continuation by carrier: `step`
(`Cas/Lang/Interp.lean:70-83`) applies `k` exactly once per operation, and
`Status.running` is the reified suspension (`Prog.lean:9-10`). At L-A the count is
*proved*: `runPFrom_done_answers` (`Defun.lean:1537`) gives
`(answersFrom H env p).length = p.length` — exactly one answer per line.

§3 D9's `zero` operations exist by type: `CasE.Ans (.fail _) = Empty`
(`Cas/Lang/Ops.lean:29`), with the docstring "a refused program has no continuation, by
type" (`Ops.lean:7-9`). §3 D9's `many` is refused by the carrier, not by a check: `Prog` is
a finite inductive tree, so no handler can retain a resume token.

**Composition rule check.** §3 D9's "a checked handler that returns normally causes the
machine to consume exactly one resume" is `interpret`'s structural recursion
(`Cas/Lang/Handler.lean:47`), and `interpret_bind` (`:53`) is its composition law.

**Exactness.** EXACT: max resume count is 1, min is 0 (on the refusing path), and both are
proved rather than declared. No `ResumptionDomain` carrier exists to hold the bounds.

---

## 11. D10 — temporal and concurrency topology (`TemporalDomain`)

**Anchor, PARTIAL.** §3 D10's `seq` clause — "`seq` adds every normal completion of the
left before entry to the right" — is exactly `runPFrom_append_done`
(`Cas/Lang/Defun.lean:1887`): the run of `pre ++ post` continues from the history `pre`
determined, at the word `pre` left. That is the must-happens-before edge for `seq`, proved,
and it is the missing middle `Fragments.lean` says FRAME-1 needed.

A second, less obvious anchor: `PProg.puts`'s ORDER is the estate's happens-before at the
write dimension, and DIV-2 (§3) proves it is *observable*, which is what makes the ordering
a semantic fact rather than a presentation choice.

**Everything else has NO ANCHOR.** No `par`, `race`, `fork`, live-fiber bound, lifetime
mode, or event site exists. `EC1-FC06` ("race is commutative") has nothing in the estate to
falsify — though DIV-2 is its `seq`-level analogue and shows the estate's observable would
in fact separate swapped children if a `par` were added.

**Exactness.** The `seq` edge is exact. The rest is unclassifiable.

---

## 12. D11 — interruption and cancellation (`CancellationDomain`)

**NO ANCHOR.** Zero occurrences of interrupt / cancel / mask as constructs. The single
textual hit is `Cas/Lang/Handler.lean:17-18`, a docstring noting that fibers, interruption
and the error channel "are the target monad's" concern in the Effect adapter — i.e. they
are explicitly *outside* this library.

**Exactness.** Not applicable.

---

## 13. D12 — failure and cause topology (`CauseDomain`)

**Anchor, PARTIAL.** `Refusal` (`Cas/Lang/Interp.lean:28-33`) is the carrier, and it is
FLAT: six constructors, no `then`/`both` shape, no defect/typed split, no interruptor.
`Refusal.ofAdmission` (`:34`) routes admission's two clauses in.
`Refusal.absentAddr : Refusal → Option Addr32` (`Defun.lean:1720`) is the one projection
the sandwich uses, and `runPFrom_absent_sound` (`:1766`) is the only proved fact about a
cause's *content*: the address a refusal names is enveloped.

The one statically-decided may-cause exclusion is `runP_no_dangling` (`:2101`), and it
excludes exactly one value — `.failed "defun: dangling answer index"`.

**Composition rule check.** §5's `catch p h` row has NO ANCHOR: nothing in the library
catches a `Refusal`. `require` (`Cas/Lang/Ops.lean:59`) is fail-closed and one-way, and
`fail` answers `Empty`, so there is no continuation to hand a handler. §3 D12's "`ensure`
adds finalizer causes with `then`; `par` can add `both`" has no carrier at all.

**Exactness — DIVERGENCE PROVED (DIV-4).** §3 D0 calls `AERDomain` exact and §6 reduction
10 warns that `E = empty` does not remove defects. At L-A the warning is stronger than
stated: the envelope's two decidable outputs — empty reads and closed dataflow — do not
bound the refusal set at all.

```lean
theorem div4_envelope_does_not_bound_the_error_row :
    ∃ (p : PProg) (w : Word),
      PProg.reads p = []
        ∧ (PProg.envelope p).dataflowClosed = true
        ∧ (runP Hconst p w).1 = .refused (.collision zero)
```

Witness: `p = [put 0 0 [] []]` at a word already binding that address to a different node,
under a collapsing `H`. Empty reads, closed dataflow, still refuses — with `collision`, the
explicit Level-0 witness clause. Any classifier row promising a narrowed error set from
envelope facts is unsound at this rung.

---

## 14. D13 — foreignness and reification grade (`ForeignDomain` / `ReificationDomain`)

This is the dimension the operator named, so it gets the fullest treatment; the decidability
question is §16.

**Anchor, PARTIAL — and every grade in `EC1-C24` has a landed witness.**

| Grade | Estate anchor | Status |
| --- | --- | --- |
| `closed` | `PLine.HashDetermined` (`Defun.lean:1480`), discharged for every `CasSig` line by `PLine.hashDetermined` (`:1496`) | LANDED as a theorem |
| `modeledForeignEffect` | `LlmSig` / `AgentSig` (`Ops.lean:43`, `:46`), interpreted away by `Prog.handleLlm` (`Interp.lean:184`); counter-witness at `Defun.lean:2190` | LANDED as a witness |
| `receiptOnly` | `replayHandler` (`Handler.lean:279`) — a checked record with no theorem relating a real call to the model | LANDED, and it is precisely §3 D13's definition |
| `unadmitted` | `RunParams.toPProg : RunParams → Option PProg` (`Cas/Backend/Mcp.lean:208`) — the `none` case | LANDED; and the grade "cannot occur in a CheckedProgram" is enforced by the `Option`, not by a check |
| `modeledPureAtom` | `PIn` (`Defun.lean:167`) + `PIn.resolve` (`:199`) — see §16 | PARTIAL |

`PLine.HashDetermined`'s docstring (`Defun.lean:1448-1479`) *is* the D13 ruling, already
written: inside the boundary, no trace store, because the answer is recomputable from the
operation; outside it, `(out, deps, recipe)` from `Persistable`/`PersistedCache`, summed
into the signature and oracled away in `Prog.handleLlm`'s exact shape. The packet does not
need to mint this ruling; it needs to cite it.

**Composition rule check.** §5's `registered foreign op` row ("descriptor exact; declared
op/capabilities/frame in may") diverges from the landed regime in one respect that matters:
the estate does not have a *registry* of foreign operations with declared frames. It has a
*signature sum* — `Sig.sum` (`Sig.lean:18`) — and the price is stated out loud in
`Defun.lean:1474-1476`: "the price is the envelope for the summed program, which is correct
and is said out loud rather than hidden". So the landed composition rule for a foreign
operation is not "add its declared frame to may"; it is "the envelope for the summed
program does not exist". That is a strictly weaker and honest rule, and §5's row is an
upgrade the estate has not paid for.

**Exactness.** The grades are exact where a witness exists and undefined where none does.
No grade is computed from a program today — see §16.

---

## 15. D14 — observations and provenance (`ObservationDomain` / `ProvenanceDomain`)

**Anchor — `ObservationDomain` is LANDED, and it is better than the proposal.** The estate
already refuses to call two programs equivalent without a declared mask, and it has two
masks with a proved relation between them:

- the coarse mask: `ObsEq` (`Cas/Lang/Representation.lean:134`) — equality of
  `interpretRef` at every starting word;
- the fine mask: `eq_of_forall_interpret` (initiality — agreement under every interpretation
  IS equality), cited in `Fragments.lean`'s L-P row;
- the bridge that lets a run-gate verdict be read as a stratum-3 equality: `ObsEq.of_run`
  (`Representation.lean:162`) and `ObsEq_embed_of_runP` (`Defun.lean:419`).

§3 D14's list of "possible masks" includes "CAS status and word" — that is `ObsEq`, exactly.

**The mask's blind spot is proved, not assumed — DIVERGENCE PROVED (DIV-6).**
`ObsEq.run_done` (`Representation.lean:182`) transfers the value AND the word;
`ObsEq.run_refused` (`:198`) transfers the refusal ALONE, because `interpretRef`'s error
branch carries no word. So the mask is strictly coarser than "the word":

```lean
theorem div6_refusal_word_outside_the_mask :
    ∃ (p q : PProg),
      (runP Hlen p []).1 = .refused (.noObject far)
        ∧ (runP Hlen q []).1 = .refused (.noObject far)
        ∧ (runP Hlen p []).2 ≠ (runP Hlen q []).2
```

Witness: `p = [load (lit far)]` and `q = [put 0 0 [] [], load (lit far)]`. Same refusal,
different partial words. `Fragments.lean` states the consumer-facing consequence: "Do not
gate on a partial word." Any `ObservationDomain` the packet defines must reproduce this
asymmetry or it will be finer than the estate's chosen observation and will fail gates the
estate passes.

**`ProvenanceDomain` — PARTIAL.** The one pin the estate carries explicitly everywhere is
the address function: `H : Bytes → Addr32` is a parameter of every statement, never a
global, which is precisely §3 D14's "missing pins remain explicit". `manifestVersion`
(`Cas/Backend/Mcp.lean:545`) and `schemeVersion` (Grammar) are the surface pins. The trust
boundary is `Cas/Lang/Auth.lean`'s prover/verifier pair. Alphabet identity, compiler
identity, host identity: no anchor in Lean — they live in the evidence plane
(`CLASSIFICATION.md` §7), which is the right place.

---

## 16. D13, the question asked: what would make the reification grade DECIDABLE

**Why `PLine.HashDetermined` is not it.** Its statement (`Defun.lean:1480-1483`) quantifies
over three infinite domains:

```lean
def PLine.HashDetermined (l : PLine) : Prop :=
  ∀ (env : List Addr32) (w w' : Word) (b : Addr32),
    runPFrom H env [l] w = (.done b, w') → PLine.answer H env l = some b
```

It quantifies over RUNS. Nothing of that shape can carry a `Decidable` instance, and it was
never meant to: it is the *specification* the grade must be sound against, not the grade.

**The estate's model of the right shape, three instances.** Every one is a `Bool` on
stratum-1 data paired with a theorem that `= true` implies a property of EVERY run:

| Decidable predicate | Soundness theorem |
| --- | --- |
| `Envelope.dataflowClosed : Envelope → Bool` (`Defun.lean:1221`) | `runP_no_dangling` (`:2101`) — excludes a whole refusal clause at every word |
| `Node.WF` with `instance (n : Node) : Decidable n.WF` (`Cas/Core/Node.lean:47`, `:50`) | used as the `dif` gate in `putWord` (`Defun.lean:244`) |
| `Word.wf : Word → Bool` (`Cas/IR/Word.lean:150`) | `runP_preserves_wf` (`Defun.lean:368`) |

`dataflowClosed_eq` (`Defun.lean:1225`) is the pattern's tell: the envelope's decidable
field and the table's are the same thing, by `rfl`. That is the model to copy.

**What has to be true for `reificationGrade : Program → Grade` to be decidable.** Three
conditions, of which the estate already satisfies two:

1. **The program carrier must be a first-order finite sum with `DecidableEq`.** SATISFIED:
   `PIn` (`Defun.lean:167`) and `PLine` (`:180`) both `deriving DecidableEq`, `PKind`
   (`:1134`) likewise. `PProg` is a `List`.
2. **Each operation must carry its grade as DATA, on the signature.** NOT SATISFIED, and
   this is the whole gap. `Sig` (`Cas/Lang/Sig.lean:12-14`) has exactly two fields, `Op`
   and `Ans`. There is nowhere to put a grade, so the grade cannot be read off an
   operation, so a program-level fold has nothing to fold. `EC1-A06 Alphabet` ("closed,
   versioned table of operation descriptors") and `EC1-A07 OpDesc` are the proposal's name
   for the missing field, and adding it to `Sig` — one field, `grade : Op → Grade`, plus a
   per-signature discharge obligation `∀ op, grade op = closed → HashDetermined op` — is
   the minimal change that makes D13 computable.
3. **The atom set must be closed and its membership decidable.** SATISFIED in form by
   `Sig.sum`: an operation is foreign iff it is `Sum.inr`, and that is decidable. What is
   missing is only that `Sum.inr` is a *structural* fact about the signature, not a
   *graded* one — `AgentSig = CasSig ⊕ₛ LlmSig` makes every `LlmSig` operation foreign
   uniformly, with no room for `receiptOnly` vs `modeledForeignEffect`.

**Exhibit — the fold works, and shows exactly why it is uninformative today.** In the
companion Lean file:

```lean
inductive Grade where | closed | modeledForeignEffect  deriving DecidableEq, Repr

def PLine.grade : PLine → Grade
  | .put .. => .closed
  | .load _ => .closed

def PProg.grade (p : PProg) : Grade := p.foldl … .closed

theorem grade_closed_sound (H : Bytes → Addr32) (p : PProg)
    (_h : PProg.grade p = .closed) : ∀ l ∈ p, PLine.HashDetermined H l :=
  fun l _ => PLine.hashDetermined H l

theorem grade_is_constant_at_LA :
    PProg.grade [.put 0 0 [] [], .load (.lit zero), .load (.ans 0)] = .closed := by decide
```

The soundness theorem is discharged by *citing* `PLine.hashDetermined`, which is the point:
the grade is worth computing only because a theorem already says what `closed` buys. And
`grade_is_constant_at_LA` is the finding, not the filler — at L-A the fold returns `closed`
unconditionally, because `CasSig` has one grade. The predicate is not wrong; the signature
is too small for it to discriminate. Condition 2 is what makes it discriminate.

**On `ALGEBRA.md` §3's `PureExpr` / `PureAtom`.** The estate already has `PureExpr`, at its
degenerate two-constructor size: `PIn = lit Addr32 | ans Nat` (`Defun.lean:167`) with
`PIn.resolve : List Addr32 → PIn → Option Addr32` (`:199`) as its total denotation
`Value Γ → Value τ`, and `PIn.WF` (`:174`) as its decidable well-formedness. `ArgMap` is
`PLine.operands` (`:1147`) plus the payload field. §3's rule "effect-free calculation is
never represented by a `Prog` constructor" is *already law here*: `PLine` has no pure
constructor, and pure data enters only as literal payload bytes and `PIn.lit` operands.
`PProg.resolve_sound` (`:1332`) is the totality argument in its landed form — "there is no
third source, because `PIn` has two constructors" (`:1326-1327`).

So the growth path for `PureExpr` is: grow `PIn`. Membership stays decidable for free
because `PureExpr` as proposed is a closed inductive with total constructors — the burden
moves entirely onto `PureAtom` clause 5 (host conformance), which is *not* decidable and is
not claimed to be. That split is correct as proposed.

One correction the packet owes itself: `PureAtom` clause 4 is "an explicit statement that
it reads and writes no effect world." A *statement* is a declaration, and §3's own closing
line ("There is no 'trust me' pure escape") forbids exactly that. In the estate the check
that makes it not-a-declaration already exists in one form: an operation is world-free iff
it never appears as a `Prog.vis` node, i.e. iff it is a host function rather than a
signature operation — which is decidable, structurally, and needs no attestation. Clause 4
should be stated that way, as a carrier fact, or it is an unchecked field.

**And "holed off" already has a mechanism.** `Prog.handleLlm : Prog AgentSig A → Prog CasSig A`
(`Cas/Lang/Interp.lean:184`) is a monad morphism that interprets away one summand of the
signature; `Handler.sum` (`Cas/Lang/Handler.lean:63`) is its general form. That is the
operational meaning of holing off a foreign fragment, landed. What is missing is only the
decidable LABEL saying which summand is which — condition 2 again.

---

## 17. Kernel receipt

```
$ cd library/cas && lake env lean \
    /Users/pooks/Dev/foldlab/.staging/agent-reports/2026-08-31-effect-core-classification-anchors.lean

'EffectCoreV1Anchors.div1_dataflow_seq_is_not_union' does not depend on any axioms
'EffectCoreV1Anchors.div1_closure_not_seq_homomorphic' does not depend on any axioms
'EffectCoreV1Anchors.div2_world_seq_is_not_commutative' depends on axioms: [propext]
'EffectCoreV1Anchors.div3_op_footprint_ne_world_footprint' depends on axioms: [propext]
'EffectCoreV1Anchors.div4_envelope_does_not_bound_the_error_row' depends on axioms: [propext]
'EffectCoreV1Anchors.div5_write_addresses_not_in_envelope' depends on axioms: [propext]
'EffectCoreV1Anchors.div6_refusal_word_outside_the_mask' depends on axioms: [propext]
'EffectCoreV1Anchors.d5_fuel_exhaustion_is_suspension' depends on axioms: [propext]
'EffectCoreV1Anchors.grade_closed_sound' depends on axioms: [propext, Quot.sound]
'EffectCoreV1Anchors.reads_append' depends on axioms: [propext]
'EffectCoreV1Anchors.puts_append' depends on axioms: [propext]
```

No errors, no `sorryAx`, no `Classical.choice`.

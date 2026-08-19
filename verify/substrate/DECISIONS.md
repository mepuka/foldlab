# Substrate model — decisions the specification did not fix

Task-local placeholders follow the numbering rule in `proto/DECISIONS.md`;
repository D-numbers are assigned at merge.

### S1. One instrument for all three claims: the Lean lane

Decided: CL-1, CL-4, and CL-5 are all proved in Lean 4.33.0, zero external
dependencies, in the package's own `Definitions` / `Laws` / `Proofs`
partition, with the register obligations (base, consecution, safety) written
as Lean propositions in the register's inductive-invariant idiom rather than
as an Apalache decomposition.

Alternatives, priced:

- **A bounded check for CL-4 and CL-5 (TLC or Apalache).** The lifecycle
  machine over eleven symbols and eight states is small enough that a bounded
  check would close it exhaustively, and the register's at-most-one-current
  clause is precisely the shape the catalog and effector models already check
  inductively. The price is three: a second toolchain in a package whose whole
  claim to zero external dependencies rests on being Lean-and-core only; a
  rolling upstream jar whose digest has to be recorded per run, which is why
  the mixed-instrument gates run on a schedule instead of per push; and a
  second statement of the same objects — the session fold and the alphabet
  would live in Lean for CL-1 and in a `.tla` module for CL-4, which is the
  twin this package exists to refuse. Rejected on the third price alone.
- **A property-test lane in the runtime languages.** Cheaper to write and it
  would exercise the shipped code rather than a model. It is also a different
  rung: it corroborates, it does not prove, and the runtime differentials the
  ledger rows cite already occupy that rung. Rejected as a substitute, kept as
  the thing the ledger rows cite.

A third style is forbidden by the dispatch and none is introduced.
**Load-bearing? yes** — the instrument choice is what makes the package's
zero-dependency and single-statement claims true.

### S2. The canonical encoding and the digest are parameters, not definitions

Decided: every byte-level statement in CL-1 quantifies over an arbitrary
encoding, and the sharper one over an arbitrary INJECTIVE encoding; the digest
is likewise a parameter. Alternatives: define a canonical encoder in the model
and prove it injective; import the estate's own canonical form. Why: the
estate's canonical bytes are the certifier's wall and its differential's
claim, and restating them here would be a second canonicalizer — a twin in the
one place the estate least wants one. Quantifying instead makes the theorem
stronger, not weaker: it holds of every injective canonical form, including
the one the runtime actually ships. **Load-bearing? yes.**

### S3. Collision-freedom is not claimed

Decided: the model claims equal groups give one digest, and never the
converse. A mutated group field is proved to move the canonical BYTES; that
the digest moves with them holds unless the digest collides, and
collision-freedom stays in the trusted base exactly as it does in the kernel.
Alternatives: assume an injective digest and claim the converse outright. Why:
an assumed-injective hash is a claim about SHA-256 wearing a model's clothes.
The executed control witnesses the moved bytes on a concrete pair, which is
the honest evidence for that direction. **Load-bearing? yes** — it is the
difference between a theorem and an overclaim.

### S4. The lifecycle machine is a table, not a total function

Decided: `Machine` is a list of rows and `stepOf` is partial; totality is a
property of the shipped table with its own executed control. Alternatives:
define the step as a total Lean function, which makes totality free. Why: a
totality claim no mutant can break is not a claim. A total function cannot
express a machine missing a symbol, so the control that proves the totality
arm can fail would have nothing to be. **Load-bearing? yes.**

### S5. The alphabet is consumed, never re-spelled

Decided: the model declares its eleven symbols and their placement column as a
roster, and a gate arm holds that roster against the transcribed
status-events vocabulary's own canonical rendering — name for name, in the
table's own row order, executed, with its own named failure reason and its own
drift control. Alternatives: generate the Lean alphabet from the table at
build time; import the transcription. Why: generation would put a code
generator inside a proof package and make the model's own source unreadable
without running it; importing is impossible across the language boundary. The
checked-roster shape gets the same guarantee — a drift reddens the gate rather
than surviving as a twin — at a fraction of the machinery. **Load-bearing?
yes** — this arm is what keeps a hand-typed event name from living here.

### S6. The alphabet drift control is derived at gate time, never committed

Decided: the mutant table the drift control runs against is produced from the
real transcription by a single substitution inside the gate, and only the
control's TRACE is committed. Alternatives: commit a mutated copy of the
status-events group beside the gate. Why: a committed copy of the table is
exactly the second spelling the arm exists to refuse, and it would rot
silently the first time the transcription moved. **Load-bearing? yes.**

### S7. The incarnation chain reuses the kernel's pin well-foundedness idiom

Decided: acyclicity is well-foundedness of the predecessor relation under a
landing-rank embedding, proved by mirroring the kernel's own program-pin
argument, with the chain carried newest-first and an inductive landing order
in place of the kernel's admission order. Alternatives: state acyclicity as a
positional predicate over list indices; state it as absence of a cycle in a
reachability closure. Why: the kernel already carries this argument, proved,
in this repository and at this toolchain; a second shape for the same
mathematics would be a second vocabulary. **Load-bearing? maybe** — the claim
is the same under any of the three; the reuse is what makes it reviewable
against something already ratified.

### S8. Landed-current is a list, not a partial function

Decided: the register's current bindings are `List (Store × Nat)`, and
at-most-one-per-store is an invariant with a consecution proof and a mutant
that breaks it. Alternatives: model the binding as `Store -> Option Name`. Why:
a partial function makes the claim true by construction and therefore empty,
and the unfenced mutant — a landing that appends beside the incumbent instead
of replacing it — would have no way to exist. **Load-bearing? yes.**

### S9. The store digest and the register fence cite kernel sorts

Decided: the store directory is `Kernel.Digest DeclKind.resource`, the
incarnation register is `Kernel.Digest DeclKind.program`, its fence is
`Kernel.Token` at that register, and the session groups are `Kernel.Value`.
Incarnation and session NAMES stay substrate-local numerals. Alternatives:
mint substrate-local sorts throughout; brand incarnation names with a kernel
declaration kind. Why: the kernel's digest brands name DECLARATION kinds, and
an incarnation is a run while a session is evidence — neither is a
declaration, so branding them would misuse the sort rather than cite it. What
IS a declaration or a fenced register cites the kernel, and the two
must-not-compile controls are the sort discipline made executable.
**Load-bearing? yes** — this is the citation direction the model home ruling
turns on.

### S10. The model home cites the kernel and the kernel never cites back

Decided: `verify/substrate/` is its own package requiring `kernel` by path,
and the gate carries an import-direction arm with its own named failure reason
that refuses a reverse reference and refuses a moved kernel tree.
Alternatives: extend `verify/kernel`. Why: the substrate model is a carrier's
concern, and a referee that imports its carriers' concerns stops being a
referee. **Load-bearing? yes.**

### S11. What the model deliberately does not cover

Decided, and recorded here rather than discovered later: no liveness theorem
of any kind — what the substrate is doing NOW is unsayable in this package as
it is everywhere else in the estate's algebra; no clustering, consensus, or
replication claims, the posture being single-server; and nothing about the
vendor's own implementation of the surface the vocabulary transcribes. The
model covers the estate's USE of that surface. Alternatives: none — these are
the specification's own stated bounds, carried forward so the package states
them where the proofs are. **Load-bearing? yes** — a bound stated only in the
specification is a bound the next reader of this package will not find.

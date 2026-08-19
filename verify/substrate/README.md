# verify/substrate — the substrate model, first slice

The machine-checked model behind the estate daemon's proof track: carriage
invariance for the substrate session fact, lifecycle-machine soundness over
the transcribed status vocabulary, and incarnation chain integrity. Lean
4.33.0, one path dependency (`../kernel`), no external dependencies.

Three claims, stated and proved here:

- **CL-1 — carriage invariance (posture neutrality).** The substrate session
  fact is a function of three declared groups and of nothing else: two mints
  whose groups are one value fold to one session value, hence to one byte
  string under every canonical encoding, hence to one digest under every
  naming of those bytes. Which side minted — a privileged client folding the
  greeting it received, or the daemon folding the options it started under
  plus the registration it observed — is carriage and never an input.
- **CL-4 — lifecycle machine soundness.** The connection machine over the
  transcribed eleven-symbol status vocabulary is total; readings are read
  within states and never move them; a transition lands in the state its own
  event names; the terminal state absorbs and is reachable; and drain and
  close are distinct paths to that shared terminal.
- **CL-5 — incarnation chain integrity.** Successor-names-predecessor over
  one store directory is acyclic, by well-foundedness of the predecessor
  relation under a landing-rank embedding; and at most one incarnation stands
  landed-current per store directory at every register revision, by base,
  consecution, and safety over the register's inductive invariant.

## Agent direction

Read `../AGENTS.md` first for the model-gate laws this package works under.
The kernel is CITED, never restated and never imported back: canonical-value
identity, the branded digest sorts, and the register's fencing token are the
kernel's, and the gate's import-direction arm refuses a reverse reference and
refuses a moved kernel tree.

The lifecycle machine's alphabet is the transcribed status-events vocabulary.
This package does not re-spell it: it declares a roster and the gate holds
that roster against the transcription's own canonical rendering, name for name
and in the table's own row order, with its own named failure reason and its
own drift control. A status event spelled here and there is the drift class
the vocabulary discipline exists to refuse, so a divergence reddens the gate.

What is machine-generated inside this directory is `controls/*.cex.txt`, each
control's executed refutation, plus `controls/alphabet-equality.txt`, the
alphabet arm's clean record. The gate re-runs them and diffs — a drifted trace
is a red gate, never a stale file to update by hand.

One level deeper: `Substrate/Definitions.lean` for the objects and the stated
abstractions, `Substrate/Laws.lean` for statements, `Substrate/Proofs.lean`
for proofs, `controls/` for the executed refutations, `must-not-compile/` for
the sort-discipline refusals and their compiling witness twins, and
`DECISIONS.md` for every choice the specification did not fix.

## The gate

`./run.sh` is the gate, not a convenience. It fails unless every clean
configuration is clean AND every control is refuted on its own named violation
string. Its arms, in order: package roster; toolchain and
zero-external-dependency pins; import direction; source hygiene; the
definitions / statements / proofs partition and the law roster; the empty
private-theorem set; `lake build`; the theorem roster and the axiom-footprint
sweep over every rostered theorem; the alphabet-equality arm and its drift
control; six executable negative controls with committed traces and an orphan
check; two must-not-compile refusals with pinned diagnoses and compiling
witness twins.

## Bounds

No liveness theorem: what the substrate is doing NOW is unsayable here, as it
is everywhere else in the estate's algebra. Single-server posture — no
clustering, consensus, or replication claims. The vendor's own internals are
not modeled; the model covers the estate's USE of the transcribed surface.
Collision-freedom of the digest is not claimed anywhere: a mutated group field
is proved to move the canonical bytes, and the executed control witnesses the
moved bytes on a concrete pair. Runtime correspondence is not claimed — the
runtime differentials that corroborate these claims are named in the ledger
rows, and no refinement map ties them to this model.

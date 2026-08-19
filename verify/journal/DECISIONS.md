# Journal model gate — decisions

Run 2026-08-19. One entry per decision the ticket did not fix: decided /
alternatives / why / load-bearing flag. `README.md` carries the run record and
the claim with its bounds; `FINDING-001.md` carries the one counterexample
that changed a law's statement.

## JD-1. A digest is the content it covers, and heads are prefix values

Decided: model identity as the sequence of pairs a record's chain covers,
`Dig(r) = r.prev \o <<r.pay, r.seq>>`, with genesis as the empty sequence.
Alternatives: an uninterpreted function symbol with an injectivity axiom
(TLC cannot enumerate it); an integer digest space with a hand-written
collision-free table (a table is a hand-authored model verdict); the record
itself as its digest (unbounded nesting). Why: this is injective in every
field by construction, which is exactly the collision-freeness a hash chain
assumes, and it stays finite under the configured cap. The cost is stated as
an abstraction: collision resistance is ASSUMED and nothing here is a claim
about SHA-256. **Load-bearing? yes** — every law about tamper evidence reads
through it.

## JD-2. The digest covers the sequence number, because `EntryDigest` does

Decided: the modelled digest binds `seq` alongside payload and prev.

The first draft covered only the payload prefix. TLC refuted JL4 against it:
the append path's own-bytes re-read (`DigestHex(stored.Data) == digest`) would
accept a record whose sequence field had been renumbered, so a handle could
adopt a head at a position the record did not claim. Reading
`go/canonical/canonical.go` settled it — `EntryDigest` serialises
`{"payload":…,"prev":…,"seq":…}` and hashes those bytes, so the runtime binds
the sequence and the model was understating the machine. Alternatives: keep
the weaker digest and carry the JL4 violation as a finding (it would have been
a finding about the model, not the machine, and publishing it as a runtime
defect would have been false); check `seq` separately in the duplicate branch
(a second verifier, which is precisely what D60 forbids). Why: a model that
understates the runtime's identity manufactures defects that do not exist.
**Load-bearing? yes.**

## JD-3. The reported outcome is state, so JL2 and JL4 stay independent

Decided: carry each appender's last reported verdict (`stored` / `duplicate` /
`conflict`) as a model variable, and state JL2 against it.

The first draft inferred the verdict from the handle cursor, which made the
faithless "lost append reported as stored" variant violate JL4 as well as JL2
— the two laws were not independent, and `verify/AGENTS.md` asks for controls
that prove they are. It also produced a spurious refutation: a losing appender
whose rival stored byte-identical bytes legitimately holds the same cursor a
winner would. Alternatives: leave the verdict implicit and narrow JL2 (it
would no longer say anything about what the caller is told); a separate
"reported" history variable per attempt (more state for no more content). Why:
what an append TELLS ITS CALLER is the thing the law is about, and a model
that cannot express the report cannot check it. **Load-bearing? yes.**

## JD-4. Three clean configs, not one, each naming what it bounds

Decided: split the ratified model across a race config (no adversary, no
crash), an adversary config (one corruption), and a crash config (one crash
event), rather than enabling everything at once.

Alternatives: one config with every budget enabled (the product of the
corruption space and the crash space made the closure impractical at useful
appender counts, and shrinking the cap to compensate would have removed the
race); check the laws only where they are cheapest (a law nobody checks under
corruption is not checked). Why: each law's bounds are then honest and
separately stated, and the state invariant `ChainIsSingleAndWellFormed` can be
listed exactly where an adversary is not rewriting storage underneath it.
**Load-bearing? no** — the split is a bounds decision, not a law.

## JD-5. The refinement is claimed against the restricted create path

Decided: `JournalCatalog.tla` checks the refinement over a create-path spec —
resolve-check, then snapshot, then CAS, with a fresh handle at begin — not
over `Journal.tla`'s whole alphabet.

The journal is content-blind: appending the same payload twice is lawful
there, and the catalog's convergence law (W1/W3) would fail over the raw
journal's image. Convergence is the daemon's law, enforced above the journal
by the resolve-check. Alternatives: put a resolve-check inside the journal
model (it would model a journal that does not exist); weaken the catalog's
invariants over the abstraction (rewriting a ratified law to make a new gate
green); claim no refinement and leave the two proofs overlapping (this is the
thing the ticket exists to fix). Why: the catalog daemon IS resolve-check ∘
journal, and saying so is both the true statement and the checkable one. The
journal's extra generality is recorded as an asset exactly as the catalog's
was. **Load-bearing? yes.**

## JD-6. The refinement's negative control is the split-CAS obligation itself

Decided: discharge the received split-CAS conformance obligation by making
`NoCAS` a refinement control — drop the expected-position guard and
`CatalogRefinement` must die.

Alternatives: assert the correspondence in prose beside the model (an
unchecked claim); add a bespoke "split-CAS" invariant (a second name for the
refinement); wait for R4 against the running journal (that is the other half
of the obligation, and it is owed, not delivered here). Why: the obligation
was "the catalog's stale-CAS branch must have a real implementation where
begin and finish are separate operations", and a control that kills the
refinement on exactly the schedule R4-FINDING-001 recorded is the mechanical
form of that sentence. **Load-bearing? yes.**

## JD-7. The refinement modules read `Catalog.tla` in place

Decided: `run.sh` puts `../catalog` on TLC's module path; nothing is copied.

Alternatives: copy `Catalog.tla` beside the journal model (two copies of a
transition table are two transition tables, which is the exact failure the
"stated once" law exists to prevent); move the shared spec to a common
directory (a layout change this ticket has no mandate for). Why: the catalog's
table stays stated exactly once and the refinement reads the ratified file.
The cost is one portability hazard, handled explicitly: the JVM classpath
separator is `;` on Windows JVMs and `:` elsewhere, and getting it wrong turns
the refinement runs into "module not found", which reads like a skip rather
than a failure. **Load-bearing? no.**

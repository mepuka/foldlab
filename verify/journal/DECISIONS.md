# verify/journal — DECISIONS

One entry per decision the ticket did not fix. Numbering is local to this
directory.

### D1. The digest of an entry is its declared history extended by itself

Decided: content addressing is modelled as the identity function, and an
entry's digest is `prev` extended by `<<payload, seq>>`. Genesis is the
empty history. Alternatives: an abstract injective hash over an
uninterpreted sort (Apalache-friendly, but TLC cannot enumerate it); the
whole stored prefix as the head (correct but makes the entry type
recursive and the tamper alphabet unenumerable); a payload sequence as
the head (collides on ill-formed stores, which under-detects tamper
exactly where tamper matters). Why: the chosen form is injective by
construction, keeps the entry type flat, and matches the catalog model's
own `Digest(v) == v` so the refinement does not have to translate two
notions of identity. Hash collisions are stated as outside the model.
**Load-bearing? yes** — every chain law is stated through it.

### D2. `written` is a history variable; tamper never touches it

Decided: the model carries both what the store holds and what the journal
durably appended, and the tamper actions mutate only the former.
Alternatives: model the store alone (then "the entry was written" is
unstatable and every soundness law collapses into a tautology about the
reader's own fold); model tamper as a mutation of both (then tamper is
indistinguishable from an append and there is nothing to detect). Why: a
verify-on-read law has to be able to say what the read SHOULD have
returned, and that sentence needs a referent outside the bytes being
checked. **Load-bearing? yes.**

### D3. Erasure is a separate bound selector, not part of the tamper budget

Decided: dropping the tail is behind its own constant rather than being a
third mutation always available at the tamper budget. Alternatives: fold
it into the tamper alphabet (then the mutation residual and the erasure
residual arrive as one undifferentiated failure and neither is legible);
leave erasure out entirely (then the ledger's durability claim rests on
an assumption nobody wrote down). Why: mutation is what the chain exists
to detect and erasure is what it cannot, so the two produce different
residuals and want different traces. **Load-bearing? yes** — the two
residual configs depend on the separation.

### D4. The read law carries the chain law as a hypothesis

Decided: `AnchoredReadIsGenuine` is stated as `ChainIntegrity => ...`
rather than standing alone. Alternatives: state it unconditionally (the
first version, refuted by the model on its own first tamper run — an
appender that adopts a forged tail chains onto it, and afterwards no
reader can separate the forgery from what was written); restrict the
tamper alphabet until the unconditional form survives (that is repairing
the spec to make the run green, which the estate refuses). Why: the
finding is real and the honest statement is the conditional one — J1 and
J4 compose rather than each standing alone, which is also the shape of
the guarantee a resuming consumer actually gets. The counterexample stays
committed as RESIDUAL-001. **Load-bearing? yes.**

### D5. The refinement mapping remembers which writer appended

Decided: a writer whose append landed but whose acknowledgement was lost
occupies a distinct phase, and the abstract creator is busy exactly while
its writer is in the pre-landing phase. Alternatives: derive "landed"
from the journal contents (tried first, and wrong — content addressing
makes two creators of one value byte-identical, so one append idles both
abstract creators and a single journal step becomes two catalog steps);
forbid two writers from holding identical entries (that deletes the race
the refinement exists to justify). Why: a refinement mapping may use
history the participants cannot observe, and this one must, because the
appender and a rival who wrote the same bytes are observationally
identical from inside. Nothing in the transition relation branches on the
phase distinction, so it adds no behaviour. **Load-bearing? yes.**

### D6. The refinement excludes crash and tamper, and says so

Decided: the refinement config runs with no appender crashes and a
trusted store, and the exclusions are stated in the module header, the
config, and the ledger row. Alternatives: extend the catalog model with a
crash action (an executor never edits the spec it builds against, and the
catalog gate is standing evidence); map a crashed writer to a busy
creator (its retry then changes the abstract expected position with no
abstract step to license it, so the mapping is simply false); leave the
exclusion undocumented (a refinement whose gaps are unstated is worse
than no refinement, because it invites the composed claim). Why: process
failure is outside the catalog model's action alphabet, and the honest
report of that is a bound, not a defect. The journal's crash behaviour is
checked in its own config instead. **Load-bearing? yes.**

### D7. The catalog spec is read in place, never copied

Decided: the gate puts `verify/catalog` on the TLA module path and the
refinement module instantiates the catalog spec from there. Alternatives:
copy `Catalog.tla` into this directory (two transition tables that must
be kept identical by discipline, which is the exact failure mode the
house rule about stating the table once exists to prevent); re-derive a
smaller abstract catalog here (a second model of the same thing, with the
same drift problem and no gate to catch it). Why: the estate's rule is
that a spec is stated once and variants re-export it; a refinement across
directories is the same rule across a directory boundary. Cost: the gate
must set `-DTLA-Library`, which is recorded in the run record.
**Load-bearing? yes.**

### D8. Anti-vacuity witnesses are configs that must fail

Decided: reachability of the stale-CAS conflict and of the uncertain-retry
duplicate is established by configs whose expected verdict is a
violation, with the trace committed. Alternatives: assert reachability in
prose (unchecked); read it off TLC's action coverage output (not a gate
verdict, and it drifts silently); add a state variable recording observed
outcomes (pays state-space cost for something an action-level negation
gets free). Why: the estate already treats "a prover that cannot fail
proves nothing" as law, and the dual — a law about a branch nothing
reaches — deserves the same mechanical treatment rather than a promise.
**Load-bearing? no** — the witnesses could move to a coverage assertion
without changing any claim.

### D9. Each control config lists only the invariant its law owns

Decided: a faithless config names the one invariant its dropped law must
lose, not the whole battery. Alternatives: check everything in every
control (then a control that breaks three laws is credited to whichever
one TLC reports first, and the one-control-one-law discipline becomes
decorative). Why: the refutation has to be attributable, or the controls
stop proving the laws independent. The catalog gate's controls already
work this way. **Load-bearing? yes.**

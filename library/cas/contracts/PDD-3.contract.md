# PDD-3 — References and recursion, slices 1–3

The contract packet for ticket PDD-3 (`.staging/wave-1/PDD-3.md`),
executing Lane A slices 1–3 of
`.staging/operational-structure/CORE-ABSTRACTIONS-PLAN.md` (:110-166)
and its theorem obligations (§3 addendum, :919-938).

Written under `.claude/skills/implement/CONTRACT.md`. Wave-1 flow
(operator-ruled): the builder writes the packet, the implementation
follows, an independent breaker comes afterward. The packet is
committed before any code under contract.

```
CATEGORIES inductive-data, specification-design, termination,
           abstraction-modules, algebraic-laws
BRANCH     agent/opus-cc-mac/pdd-3
```

CATALOG rows opened for those tags: §4.1–4.3 (exhaustive match,
destructors behind discriminators, structural recursion), §5.6/§6.x/§7.x
(prove by the function's own case split), §7.0 (round trips before
anything is built on a conversion), §3.1/§3.4/§11.2 (a remaining-work
measure, checked on every branch; write the explicit clause the moment
an edge fails the default), §8.0 (the spec form that composes), §9.1–9.5
(the abstraction function is the bridge; imports explicit and acyclic),
§1.6 (ghost values do not change executable results).

## Status — the block is RULED; slices 2 and 3 proceed

The block below was raised against the plan's one-constructor carrier
and answered by the operator on 2026-08-30 (the ruling is at the head of
`.staging/wave-1/PDD-3.md`, and it amends the plan's :127-131):

> Slice 2 grows the universe by TWO constructors —
> `Ast.reference (name : String)` (the edge into the references table)
> and `Ast.susp (thunk : Ast)` (the guard), matching Effect's pinned
> two-node spelling. […] The §3-addendum theorem stands VERBATIM: every
> cycle passes through a `susp`. Neither constructor adds a sort.

So L2 is no longer a tautology and its falsifier is a real witness
table. The break ledger carries the finding.

## The carrier, as ruled

Two arms on `Ast`, and the two spellings the probe pinned:

| Arm | Projection | Role |
|---|---|---|
| `reference (name : String)` | `{"$ref":name,"_tag":"Reference"}` | the EDGE into the table |
| `susp (thunk : Ast)` | `{"_tag":"Suspend","checks":[],"thunk":…}` | the GUARD |

`WF` grows by exactly two clauses: `reference n` asks `n ≠ ""` (the
nonemptiness Effect itself imposes on `$ref`), `susp a` asks `a.WF`.
The ADDRESS discipline is deliberately not in `WF`.

Key order in the projection is canonical (sorted), which is what puts
`$ref` before `_tag`: `$` is 0x24 and `_` is 0x5F.

**The document plane.** A new `Document` — the Lean spelling of a shape
the projection already writes (`Ast.representationDocument`), so this
mints no carrier where a seat exists:

```
structure Document where
  references     : List (String × Ast)   -- strictly name-sorted
  representation : Ast
```

`Document.WF` is: names strictly ascending (the canonical-fields
argument, verbatim from `.struct` — it is what makes the spelling
unique), every name nonempty, every code `WF`, and **guarded**.

**Guardedness, made precise.** `Ast.bareRefs` collects the table names a
code mentions at positions **no `susp` guards** — the walk stops dead at
every `.susp`. That is the plan's own "non-suspend edge relation". The
table's edge relation is `n ⇝ m ⟺ m ∈ bareRefs (R n)`, and the document
is GUARDED when `⇝` has no cycle. Since `bareRefs` stops at each `susp`,
"no cycle in `⇝`" is exactly "every cycle of the references table passes
through a `susp`" — the theorem verbatim.

Checked against the probe's real documents: the anonymous linked list
has its only `reference` under the `susp`, so `⇝` has no edges at all —
guarded. The alias cycle `{A: reference B, B: reference A}` and the
bare structural cycle `{A: struct[next: reference A]}` both give cycles
in `⇝` — refused, and they are the L2 witness tables.

**The door.** `nonEmptyReferences` narrows rather than retires: `ingest`
keeps its type and its name as the BARE-CODE arm (every existing
theorem and `#guard` over it stands unchanged), and refuses a document
that carries a table with that name — now meaning "this arm answers a
bare code", not "the subset does not reach the table". The new
`ingestDocument` is the document door, and the taxonomy grows by one
arm, `unguardedCycle`, which is what the guardedness check answers with.
The emitted admission table describes the document door; the TypeScript
interpreter (`CanonicalSchema.admitDocument`) grows the same two node
forms and the same walk, because SM-19's agreement is held by that table
or it is not held at all.

## The claim scope — what v1 does NOT claim

Stated first, because the anti-overclaim class is the one this process
turns on (C5, CLAIM-GATES G0–G6).

- **No denotational adequacy for recursive codes.** `El` is not
  extended over the new constructor(s). A reference's target lives
  outside the code, in the references table, and extending a closed
  structural denotation to it needs either fuel-indexed semantics or a
  store-relative `El` — real theory, not commissioned here (plan HARD
  PARTS 2). `El`'s denotation is a fence on this ticket.
- **Cross-door agreement is bounded to ADMISSION.** For recursive
  schemas the two doors are claimed to agree on *admitted or refused*,
  and on nothing else. Value-plane verdict triples for recursive codes
  need a fuel-indexed Lean decode and are the named follow-on.
- **Nothing is claimed about the ADDRESS discipline.** The ruling's
  "reference name = target's content address (or annotated name)" is
  the door's and the materializer's question. It is deliberately not in
  `WF`, so no theorem here says a table key resolves in the store.
- **No soundness word attaches to host code** (estate C5). The
  TypeScript side is held by the byte gate and the battery, never by a
  theorem.
- **Live validation of recursive schemas stays Effect's.** Effect's
  `fromRepresentation` handles `Schema.suspend` natively; the estate
  gates differentially at admission and does not model it.
- **A DANGLING reference is not refused, and nothing says it resolves.**
  The door checks guardedness and nothing else about names: a `$ref`
  naming no table entry is admitted. Effect's own codec admits it too
  (slice 1 pinned that), and resolvability is the address discipline's
  question, which this ticket does not open. The door's guardedness
  answer is well defined regardless — a name with no entry has no
  outgoing edge, so it can lie on no cycle.
- **A DEAD table entry is not refused.** Same reasoning, same evidence.

### Inherited by the follow-on (out of scope here)

- **Slice 5's recursive byte-gate fixture meets SM-21.** Effect writes
  an `annotations` bag on a NAMED table entry (`{"identifier":"Node"}`,
  pinned in slice 1). The Lean spelling carries no bag and the decoder
  is exact on keys, so a named recursive fixture is unadmittable until
  SM-21 lands or the door strips the bag. Slice 5 is not in this ticket;
  the finding is recorded so the follow-on inherits it rather than
  rediscovering it. The ANONYMOUS linked list carries no bag and is
  unaffected.
- **Value-plane verdicts for recursive codes** need a fuel-indexed Lean
  decode — the named follow-on, per the addendum.

## The algebra

Write `R` for a references table — a finite map from name to code —
and `D = (R, r)` for a document: the table and the root code. Write
`refs(a)` for the multiset of table names a code mentions.

**L1 — the table induces a finite edge relation.** `E ⊆ dom(R) × dom(R)`
with `n E m ⟺ m ∈ refs(R n)`. `E` is finite because `dom(R)` is finite
and `refs` is a fold over a finite tree.

**L2 — guardedness is decidable.** The predicate "every cycle of `E`
passes through a guard" is decided by a fuel-bounded search with fuel
`|dom(R)|`. Decidability is the theorem; the decision procedure IS the
door. The variant is `|dom(R)| - |visited|`, strictly decreasing on
every recursive edge — the `termination` class, estate form fuel.

**L3 — the round trip extends per constructor.** For every new code `a`,
`ofRepresentationJson (toRepresentationJson a) = some a` on the
`RepNormal` image, and `SelfCodec` and `RepNormal` each grow by exactly
one case per constructor (SM.md:169-174 names the ripple list). This is
CATALOG §7.0's rule applied: the round trip is proved before anything
is built on the conversion.

**L4 — the door is total and every refusal is named.** `ingest` answers
either a document or one member of the refusal taxonomy. Growing the
carrier must not silently widen what is admitted: every spelling that
was refused before and is still not a code is refused with the same
name.

**L5 — the projection stays injective.** Two distinct well-formed
documents have distinct canonical bytes, up to the one literal-null
collapse of register R13. A second spelling for an existing shape would
break `toRepresentationJson_inj` as stated (the argument the tuple code
already carries, Ast.lean:141-148).

```
REQUIRES   A revision-1 schema-node envelope
           {revision, value:{references, representation}} whose bytes
           are a canonical rendering. The references table may be
           non-empty — which is exactly what this ticket changes; today
           a non-empty table is refused `nonEmptyReferences`
           (Ingest.lean:93-97).

ENSURES    ingest answers a well-formed DOCUMENT (table + root) whose
           guardedness check passed, or one named refusal. old = the
           envelope as presented; the door is pure, so there is no
           second state beyond its answer.

DECREASES  |dom(R)| - |visited| for the guardedness search (fuel =
           table size, existential-fuel discipline,
           Cas/Lang/Handler.lean:115-123); structural inclusion for
           every walk over a single code (CATALOG §4.3 — recursion on
           structurally included children, so the decrease is free).

FRAME      reads: the presented envelope only. writes: nothing — the
           door is a pure function. On the generated side, the byte
           footprint is src/cas/generated/SchemaAdmission.ts and the
           schema/verdict/address fixtures the emitters own; no
           generated file is hand-edited.

FALSIFIER  per law, below.
```

## Falsifiers

```
LAW        L1 — refs is a finite fold.
FALSIFIER  exhibit a well-formed code whose refs computation does not
           terminate, or a table whose edge set is not a subset of
           dom(R) x dom(R).
BATTERY    Lean: the decidability instance elaborates, or it does not.

LAW        L2 — guardedness is decided at the door:
           `Document.guarded d = true  <->  d.Guarded`
           (`references_guarded_decidable`), where `Guarded` is the
           honest no-cycle Prop over the non-suspend edge relation and
           `guarded` is the fuel-bounded search with fuel = table size.
FALSIFIER  exhibit an UNGUARDED cyclic table the door ADMITS, or a
           GUARDED cyclic table the door REFUSES.
BATTERY    Lean: the two witness tables as `#guard`s beside the door
           (`aliasCycle`, `bareStructCycle` refused; `guardedList`
           admitted), plus `unguarded_alias_cycle_refused` and
           `guarded_list_admitted` as theorems; host side,
           library/effects/test/SchemaReferences.test.ts against the
           regenerated SchemaAdmission table.

LAW        L3 — round trip per constructor.
FALSIFIER  exhibit a well-formed code `a` in the new constructor's
           family with
           ofRepresentationJson (toRepresentationJson a) != some a.
BATTERY    Lean `#guard` beside the existing per-increment worked
           calls (Ingest.lean:387-565 is the pattern); host side, the
           schemas byte gate in `mise run check:cas`.

LAW        L4 — refusals do not silently widen.
FALSIFIER  exhibit a spelling refused before this increment and
           admitted after, or refused after under a different name.
BATTERY    the clause table's `#guard`s (Cas/Backend/Admission.lean:
           385-469) plus the admission-map byte gate.

LAW        L5 — the projection stays injective.
FALSIFIER  exhibit two distinct well-formed documents with equal
           canonical bytes.
BATTERY    Lean: `toRepresentationJson_inj` extended; host side, the
           addresses fixture in check:cas.
```

## Obligation classes that apply

`domain` (the table lookup is partial — a dangling name is a side
condition, and the probe shows Effect does not check it), `contract`,
`adequacy` (L2 is precisely where a too-weak `Q` lets a vacuous check
pass — see the Block), `invariant` (`WF` preserved on every exit path),
`termination` (the fuel variant), `abstraction` (the document is the new
abstraction boundary; every public contract states over it),
`conformance` (the byte gates), `claim-scope` (above).

Not applicable, generating nothing: `frame` beyond "the door is pure".

## Slice 1 — the spelling probe (LANDED)

Pinned from the estate's own runtime dependency, `effect@4.0.0-rc.112`
(`library/effects/package.json`; provenance row `effect-runtime`,
commit `2600f62f4532026928454dcea8d1c48557b3f942`,
`.reference/provenance/sources.lock.json`), file
`node_modules/effect/src/SchemaRepresentation.ts`. The probe executes
the library rather than reading it, so the pins are observations, not
transcriptions.

Battery: `library/effects/test/SchemaReferencesPin.test.ts` — 12 tests,
green.

The pinned spellings:

| What | Spelling |
|---|---|
| `Reference` | `{"_tag":"Reference","$ref":<non-empty string>}` — **exactly two keys**. No `checks`. No `annotations`. (`:1066-1069`, `:171-174`) |
| `Suspend` | `{"_tag":"Suspend","checks":[],"thunk":<Representation>}`, plus an optional `annotations` bag. `checks` is `Schema.Tuple([])` — the EMPTY tuple, so a `Suspend` can never carry a check. (`:984-989`, `:158-163`) |
| `Document` | `{"representation":<Representation>,"references":<References>}` (`:480-483`, `:1098-1103`) |
| `MultiDocument` | `{"representations":[<Representation>,...],"references":<References>}` (`:491-494`, `:1105-1110`) |
| `References` | `Schema.Record(Schema.String, Representation)` — a plain object, keys are arbitrary strings (`:470-472`, `:1096`) |
| key nonemptiness | `$ref` is `Schema.NonEmptyString`; the table KEY type is plain `Schema.String`. An empty `$ref` is rejected by Effect itself. |

What Effect's own codec does NOT check — all four ACCEPTED by
`fromJson`, so each is the estate door's job:

- a dangling `$ref` (a name with no table entry);
- a self alias `{A: Reference A}`;
- an alias cycle `{A: Reference B, B: Reference A}`;
- an unguarded structural cycle (a `Reference` back to `A` under a
  property signature, with no `Suspend` on the path);
- a dead table entry that nothing references.

Two further observations that bear on scope:

- **A non-empty references table does not imply recursion.** A shared
  NON-recursive named schema (an `identifier` annotation, used twice)
  allocates a table entry. So "the table is non-empty" and "the schema
  is recursive" are different questions.
- **A named table entry carries an `annotations` bag in practice**
  (`{"identifier":"Node"}`). That is the divergence already recorded at
  Cas/Backend/Admission.lean:52-62 and owned by Lane B1 (SM-21), not by
  this ticket — but a recursive fixture will meet it, so slice 5's
  byte-gate fixture depends on B1 or on stripping the bag at the door.

## Block — RAISED 2026-08-30, RULED the same day

Kept in full, because a spec bug caught before any implementation
existed is the record this process is measured by. The ruling is quoted
in [§Status](#status--the-block-is-ruled-slices-2-and-3-proceed) and the
ledger entry is in [§Breaks](#breaks).

**The plan's slice-2 carrier contradicts the pinned spellings, and the
contradiction is not cosmetic: under the carrier as written, this
packet's L2 is a tautology and its falsifier cannot be built.**

The plan specifies ONE constructor, `Ast.susp (name : String)`, "the
name is a references-table key", and the §3 addendum states the theorem
as "every cycle passes through a `susp`" (equivalently, "the
non-suspend edge relation is acyclic").

The probe shows Effect spells these as TWO different nodes:

- `Reference` carries the **name** (`$ref`) and is the table EDGE;
- `Suspend` carries an inline **code** (`thunk`) and is the GUARD.

A recursive schema's rev-1 JSON contains both. The probe's
linked-list document is
`{"representation":{"_tag":"Reference","$ref":"Objects_"},
"references":{"Objects_":{...,"next":{"_tag":"Suspend","checks":[],
"thunk":{...{"_tag":"Reference","$ref":"Objects_"}...}}}}}`.

Three consequences, in order of severity:

1. **L2 becomes vacuous.** If `susp name` is the only node that names a
   table entry, then every edge of `E` is a susp edge, so "every cycle
   passes through a susp" holds for every table. The check decides
   nothing and the door refuses nothing.
2. **The ticket's own falsifier is unconstructible.** The ticket asks
   for "an unguarded cycle the door must refuse (the witness table, as
   a counter-`example`/test)". Under a one-constructor carrier no such
   witness exists — which, by CONTRACT.md's `adequacy` class, means the
   specification is the bug, not the implementation.
3. **The carrier cannot decode what Effect emits.** `Reference` has two
   keys and `Suspend` has three, one of them a nested representation.
   `Ast.ofRepresentationJson` (SelfCodec.lean:1351-1385) matches EXACT
   object literals, key order and all — one arm per node family, each
   answering with one code. One constructor is one projection shape,
   hence one arm, so the other family has no spelling at all and slice
   3's "references table decoded and emitted through the envelope"
   would not decode a real recursive document.

The estate's own code already treats these as TWO missing
constructors, in both places that name the gap:

- `Ast.ofRepresentationDocument` — "revision 1's `references` is
  unreachable from the Lean side today (**no `Suspend`, no `Reference`
  constructor**)" (SelfCodec.lean:1444-1452);
- `IngestRefusal.nonEmptyReferences` — the same sentence, verbatim
  (Ingest.lean:93-97).

So the one-constructor collapse is drift introduced by the plan's
slice-2 line, not the estate's reading of the source.

The existing `Ast.ref (tag : UInt8)` is **not** a candidate for either
role: it is registry row zero `foldlab/cas/ref`, a `Declaration`,
unrelated to the references table (Ast.lean:74-86).

### The single question — ANSWERED: two constructors

> Does slice 2 add ONE constructor or TWO — that is, does
> `Ast.susp (name : String)` spell Effect's `Reference` (`$ref`), with
> the §3 addendum theorem restated as a POSITIONAL guardedness check
> (a cycle is unguarded when it closes through root/transparent
> positions only; guarded when it passes under a structural
> constructor) — or does the carrier grow BOTH
> `Ast.reference (name : String)` and `Ast.susp (thunk : Ast)`,
> matching Effect's pinned two-node spelling, so that "every cycle
> passes through a `susp`" stands verbatim and its falsifier is a real
> witness table?

Either answer is buildable and neither adds a sort (decision 2 is
satisfied both ways — kinds grow by arms). The estate cannot pick it
from inside the implementation without patching the spec, which is the
defect this process exists to kill (IMPLEMENTER.md step 4).

The two answers differ in what v1 can carry: the one-constructor answer
cannot spell a `Suspend` node at all, so the linked-list fixture of
slice 5 is unadmittable and the "recursive byte-gate fixture" would
have to be hand-shaped rather than taken from Effect. The
two-constructor answer admits what Effect actually writes.

## Breaks

```
BROKE      no implementation — the SPEC. The plan's slice-2 line,
           CORE-ABSTRACTIONS-PLAN.md:127-131 ("Carrier:
           `Ast.susp (name : String)` (one constructor; the name is a
           references-table key)"), carried into the ticket verbatim.
LAW        L2 — guardedness is decided at the door: the admission
           check decides "every cycle passes through a `susp`"
           (§3 addendum, CORE-ABSTRACTIONS-PLAN.md:919-926).
WITNESS    No witness exists, and THAT is the refutation. Under one
           constructor every table edge is a `susp` edge, so
           "every cycle passes through a `susp`" holds for every
           table: the law is a tautology, the door refuses nothing,
           and the ticket's own named falsifier — "an unguarded cycle
           the door must refuse" — has no solution to exhibit.
           The positive evidence is the pinned rev-1 document for the
           anonymous linked list, which carries BOTH node families:
           {"representation":{"_tag":"Reference","$ref":"Objects_"},
            "references":{"Objects_":{…"next":{"_tag":"Suspend",
            "checks":[],"thunk":{…{"_tag":"Reference",
            "$ref":"Objects_"}…}}}}}
           A one-constructor carrier has no spelling for one of them.
CLASS      adequacy — "is `Q` strong enough that no wrong
           implementation passes?" It was not: every implementation
           passed, including one that refuses nothing.
FIXED-BY   SPEC-BUG. Operator ruling 2026-08-30 amended the spec:
           two constructors, `Ast.reference (name : String)` and
           `Ast.susp (thunk : Ast)`; the §3-addendum theorem stands
           verbatim and its falsifier becomes a real witness table.
           Recorded at the head of `.staging/wave-1/PDD-3.md`.
```

The finding cost no implementation work: the probe ran first, as the
ticket ordered, and the adequacy class fired on the packet before a
line of Lean existed.

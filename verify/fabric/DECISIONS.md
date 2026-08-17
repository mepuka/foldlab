# Fabric model — decisions the dispatch did not fix

Task-local placeholders follow the numbering rule in `proto/DECISIONS.md`;
repository D-numbers are assigned at merge.

### T1. State F2 by equality of observation support

Decided: `SameDeliveredSet` compares `List.contains` for every
holder-attributed observation; `foldEvidence` is the finite set constructed
from the list. Alternatives: separate permutation and duplication inductive
relations; a multiset quotient. Why: equality of support is exactly the
equivalence generated jointly by arbitrary permutations and duplications, and
the extensional finite-set proof is the house semilattice idiom. **Load-bearing?
yes** — retaining multiplicity would destroy F2.

### T2. Model bounded redelivery with an explicit serial successor premise

Decided: `ingestSchedule` traverses every raw arrival and folds operations into
a buffer addressed by journal position. `F2bSerialSuccessorPremise` is not an
equation about that buffer: it says the in-window support of the raw arrivals
is exactly the consecutive positioned trace. The proof derives that the
shipped buffer
normalises every such duplicate/permuted schedule, and `guardedApply` advances
only at `floor + 1`. Stale entries at or below the floor may be present, but
application stays serial within a partition. The floor is a derived resume
coordinate; `guard_is_redundant` proves that pre-filtering arrivals by the
floor/window cannot change a successor-drained result. Alternatives: make the
buffer-output equation the premise; refuse every ahead-of-frontier delivery
instead of buffering it; model buffer capacity and liveness. Why: delivery 6
before 5 falsifies arrival-order application — an order-sensitive append step
yields `[3]` instead of `[2, 3]` — while the theorem remains generic in the
step function. **Load-bearing? yes** — the raw-support premise and successor
discipline are the runtime rules whose consequence the model proves.

### T3. Represent policy components uniformly

Decided: four finite sets (`capabilities`, `contextAllowlist`, `toolkits`,
`writ`) share a generic atom carrier and comparator; four numeric ceilings
(`capabilityClass`, `effortClass`, `budget`, `spawnBound`) use `Nat`. Meet is
intersection/minimum, and `≤` is subset/numeric order. Alternatives: one type
parameter per set; a single undifferentiated permission set. Why: this keeps all
spec-named components explicit while allowing one reusable finite-set proof.
**Load-bearing? no** — distinct atom types would deepen the type model without
changing F9.

### T4. Emit eleven fixed adversarial vectors as NDJSON

Decided: one provenance/count header plus 11 deterministic rows: F1 (1), F2
(2), F2b (3), F3 (1), F4 (1), F9 (2), and ACI-alphabet refusal (1).
Alternatives: seeded random traces; one large JSON array. Why: the named rows
are the smallest corpus covering every dispatched adversary and every law;
the bounded-reordering row uses list append so a buffer-less arrival-order
consumer observably disagrees. NDJSON follows the DEV-670 emitter idiom and
yields useful one-row diffs. The gate pins total/per-kind counts and every
`(kind, name, witness)` triple. **Load-bearing? maybe** — consumers
may later request more rows, but any change is an explicit regenerated wire
change.

### T5. Use algebra-specific one-law mutants

Decided: a multiplicity-retaining cell over the shipped observation carrier
drops idempotence while retaining associativity and commutativity; left choice
over the shipped `GroundCell` drops commutativity while retaining associativity
and idempotence; the arrival-order mutant uses the shipped 6-before-5 row and
drops successor discipline; trusting the requested policy drops only
meet-clamping. Alternatives: toy scalar algebras; copy four whole models. Why:
every variant now shares the shipped carrier, vector data, or executable
consumer and is killed by that exact named row. **Load-bearing? yes** — a
mutant that drops two laws does not demonstrate which discriminator killed it.

### T6. Narrow canonical JSON to the actual corpus grammar

Decided: object sorting with duplicate-key collapse, RFC 8785 string escaping,
arrays, booleans, and non-negative safe-integer leaves only; transliterate and
cite the RQ-9 integer path, and mechanically refuse a generated corpus above
`9007199254740991`.
Alternatives: Lean's general `Json.compress`; a new float renderer. Why: the
dispatch bars floats and promotes the RQ-9 route; the narrower grammar makes
the trusted emitter surface explicit and avoids re-deriving the unresolved
shortest-round-trip problem. **Load-bearing? yes** — canonical bytes are the
wall identity.

### T7. Record the unstatable floor-guard control as a proved deviation

Decided: remove the observationally redundant ingestion guard, roster
`guard_is_redundant`, and name the fourth negative-control family
`drop-successor-discipline`. This is the coordinator-approved deviation from
dispatch 30's requested drop-floor-guard control (DEV-695 round-3 ruling,
comment `7cb08c80-7c12-4a1d-9a7e-0daed812a0e5`, 2026-08-17). Alternatives:
retain the guard as defense-in-depth; continue naming the successor mutant as
a guard mutant. Why: the accepted theorem proves the guard cannot affect any
result in this model, while the 6-before-5 row refutes removal of the actual
successor discipline. **Load-bearing? yes** — it determines what the fourth
negative control honestly claims.

### T8. Run the corpus-diff self-test beside the fabric gate in Lean CI

Decided: `lean-gates.yml` runs `verify/fabric/run.sh --self-test` immediately
after the ordinary fabric gate. Its four plants exercise a corpus substitution,
a model substitution, one-row deletion, and one-row insertion. The diagnostic
states its positional ceiling as `positional-bound=one-row-lookahead`; longer
edit runs and permutations are refused but are outside its row attribution
claim. Alternatives: deepen the reporter to an edit script; enroll the controls
in `negative-controls.yml`; leave them local-only. Why: the controls exercise
the fabric gate's own regeneration comparison and use the same Lean toolchain,
so the adjacent step keeps proof and diff machinery under one runner.
**Load-bearing? yes** — a self-test that CI never executes can silently stop detecting
model/corpus divergence, while an unstated lookahead bound overclaims diagnosis.

### T9. Exercise install hermeticity through the gate runner self-test

Decided: `bun run gates --self-test` drives the install preflight against two
temporary absent-install roots and then the same present-install roots. It
plants a lockfile mutation, the real `proto/ts` lock drift in a warm temporary
tree, a stubbed frozen-install exit, and a successful install that omits
`node_modules`; the committed trace pins all four refusals. The warm drift plant
also requires Bun's output to contain `lockfile is frozen`, so an unrelated
exit 1 cannot satisfy it. `gates.yml` runs this self-test after the root frozen
install, putting the three runner controls and all preflight controls in CI.
Alternatives: a separate preflight control command; deleting the real checkout's
installs during the runner self-test. Why: the runner owns the local/CI mirror,
and temporary trees reproduce both dependency states without touching the
working checkout; the warm drift control invokes CI's exact frozen command and
now proves its cause, not only its exit code.
**Load-bearing? yes** — a control
over the real tree would make the safety test itself destructive, while an
absence-only control would miss the warm-tree lockfile drift found in review.

### T10. Shape the split F2b premise with bounded quantifiers

Decided: `WindowCoverage` quantifies over the positioned trace (for every
expected record, some arrival shares its position) and
`PositionPayloadIntegrity` over the arrivals (every in-window arrival is
exactly its trace record); `F2bSerialSuccessorPremise` is their conjunction,
and the bundled iff-form `SerialSuccessorSchedule` definition is deleted
rather than kept as an alias. `Positioned` now derives `DecidableEq` only, so
its `BEq` comes from the lawful decidable-equality bridge. Alternatives: keep
the old iff plus an equivalence theorem; state the payload half as
operation-equality-at-position without trace membership. Why: the two premise
roles carry separate citable names, and the bounded forall/exists forms make
every concrete schedule instance decidable — the emitter premise witnesses
became `decide` obligations instead of per-instance omega scripts.
**Load-bearing? yes** — later families and statements cite the halves by
name.

### T11. Kill the dropped integrity half with the shipped consumer itself

Decided: the fifth mutant `lastWriteBufferApply` is `guardedApply`'s own body
run outside its premise, killed on the reviewer-shaped conflict row
`(11,2)/(11,999)/(12,3)` with the intended trace fold as the lawful
comparator; the retained side is pinned by coverage-still-holds and
agrees-under-both-halves theorems. Alternatives: a structurally different
conflict-resolving mutant; comparing against first-write buffering. Why: the
runtime's protection against payload conflict IS the premise (redelivery of a
journal position repeats its bytes), so the honest mutant is the consumer
trusting its buffer where that premise fails — coverage holding isolates the
kill to the integrity half alone. **Load-bearing? yes** — it demonstrates
which premise half protects payload fidelity.

### T12. Emit verdict bits from the bridge-theorem terms

Decided: row constructors in `Corpus.lean` take the witness theorem's exact
statement as an argument; `Fabric/Emit.lean` (definitions only, importing
`BridgeProofs`) applies each constructor to its rostered theorem; the
`verdictOf*` combinators compute the reported comparison while demanding the
proof that fixes its outcome. Emitted bytes are unchanged. Alternatives:
grep-asserting the pinned verdict fields `true` in the gate; per-field
verdict theorems. Why: verdict truth becomes an elaboration fact — a verdict
that drifted from its theorem no longer typechecks — while the emission stays
a computed value and the corpus stays byte-diffed. **Load-bearing? yes** —
this is the mechanical closure of the vector-to-theorem binding.

### T13. Name the four durable-fold families in plain ASCII

Decided: the composed resume-then-redeliver row carries kind `F3-F2b` (the
corpus grammar is safe ASCII, so the composition symbol is transliterated
with a hyphen); the ahead-of-ceiling, multi-gap, and redeliver-twice rows are
kind `F2b`; row names are the dispatch's own phrases; the four rows append
after the existing eleven so committed row bytes and the self-test's planted
row indices stay fixed; the order- and duplication-sensitive rows use the
append step, while ahead-of-ceiling mirrors the stale row's `Nat.add`
carrier. Alternatives: a non-ASCII composed kind; one new kind per row;
interleaving new rows among old kinds. Why: family identity stays visible in
the pinned per-kind counts without moving a single committed byte of the
existing rows. **Load-bearing? maybe** — the names and kinds are the
consuming wall's family list; flagged to the coordinator in the closing
report.

### T14. Ground allowlist atoms that escalate on both new components

Decided: `indexes` 60/{60,61}/60 and `resources` {70,71}/{71,72}/{71} for
root, escalating request, and attenuated child, so the clamp row's request
escalates on both allowlists and the tree row attenuates through them; the
meet-clamping control keeps its budget discriminator, leaving its committed
trace byte-stable. Alternatives: inherit escalation from existing components
only. Why: the new fields should be exercised by the very row that audits
clamping, not carried as dead weight. **Load-bearing? no** — any escalating
values would do.

### T10. Compile the gate battery with tsgo; keep tsc as the installed referee

Decided: every battery typecheck — the root script's four projects and the
`proto/ts` stage — runs `@typescript/native-preview` (`tsgo`), pinned EXACT at
`7.0.0-dev.20260707.2` in the workspace devDependencies and spawned through its
JS launcher, never a floating `bunx`. `typescript` stays installed: the Effect
language-service CLI needs the TS API, editors keep the patched tsc, and tsc is
the referee any future tsgo diagnostic is diffed against — a tsgo-vs-tsc
disagreement is a FINDING to report, never silently absorbed by switching back.
The Effect rules the patched tsc injected into `tsc --noEmit` run as their own
lane, `effect-language-service diagnostics --project <tsconfig> --strict`, for
each project whose sources import effect: `packages/plait` in the root
typecheck script, `proto/ts` as a battery stage. The CLI checks ZERO files and
passes when a project tsconfig lacks the language-service plugin entry, which
is why `proto/ts/tsconfig.json` now carries one. Cutover evidence (this host,
2026-08-17): healthy-tree diagnostic parity 0=0 on all five project configs;
with `effect` hidden both compilers emit the same 102-diagnostic set, differing
only in emission order and CRLF, with tsc exiting 2 where tsgo exits 1; three
planted violations (TS2322, TS2375, indexed-access TS2322) refused; warm
compile chain 12.4s → 2.7s. Alternatives: keep the patched tsc (the
crisis-window cost that motivated the cutover); one root-project Effect lane
instead of per-project lanes (superset coverage, but a shape the dispatch did
not name); a version range (a dev-channel range makes every install an
unreviewed compiler swap). Why: the native binary holds its speed on the cold
trees fresh seats pay for, and parity was measured, not assumed.
**Load-bearing? yes** — a dev-preview compiler is now the gate's judge; the
exact pin, the retained referee, and the committed plant trace
(`scripts/gates-typecheck.trace.txt`) are what keep that honest.

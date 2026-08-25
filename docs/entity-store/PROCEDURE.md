# PROCEDURE — the development loop of the entity-store program

Status: RATIFIED 2026-08-25 (formulated in-session from the day-one evidence, operator
assent on the formulation and its three open joints; see `audit/2026-08-25-day-one.md`
for the evidence base). This document is itself subject to the loop it describes:
changes arrive only as standing amendments proposed in an audit entry §6 and ratified
by the operator. §8's mechanical ledger is SPECIFIED here and not yet implemented; the
implementation is a named seat.

## 1. What the loop is

The program's theory is its ratified corpus: the specifications, the committed
statements, the proved theorems with their axiom reports, and the rulings. The loop
develops that theory by alternating refutation and construction: agents attack the
current theory, surviving claims harden, falsified claims are restated with the
refuting condition incorporated, and only then do implementation seats build against
frozen statements. The structure is Lakatos's proofs-and-refutations made mechanical —
the day-one instance is exact: a kernel-checked counterexample to canon idempotence
became a conditional restatement (the lemma incorporated) and an admission clause
(A-3), leaving the theory stronger than if the conjecture had survived.

One cycle must end with strictly more proved, or a falsification incorporated. Both
are progress. Only an unexamined claim is failure.

## 2. Phases

**Phase 0 — Ground.** The invariant starting state: ratified specs, proved theorems
with axiom reports, gates green on both sides, the disposition and admission tables
current, the audit current. All work is relative to the ground and appends to it.

**Phase 1 — Refutation wave.** Advisory agents (scouts) attack the theory. Each wave
brief names its **refutation targets** — specific theorems, rulings, or spec claims
under attack — and may carry measurement riders. Disciplines: diverse vantages per
wave; every claim carries a receipt or the `UNVERIFIED:` form; deliverables land
pre-grade in `.staging/scouts/`; scouts exercise the artifacts as they stand — the
kernel-checked counterexample is the gold standard. The differential harness is a
standing machine-scout: it runs this phase continuously.

**Phase 2 — Grill and amend.** The coordinator consolidates findings into a docket
with a recommendation per joint; the operator rules. Every consequence lands as a
commit the same day, citing the finding (F-number, §6). A falsified statement is
restated conditionally, never deleted; the amendment record names the refuting probe.

**Phase 3 — Pin and brief.** Statements freeze as committed, elaboration-checked
`Prop`s. Dispatch briefs are self-contained: law of the worktree, proof-shape
analysis, accumulated house lessons, report format. No design authority is delegated;
a judgment call inside a seat is a STOP-and-report finding.

**Phase 4 — Implementation wave.** Seats build against the pins. File-disjointness by
law: one seat, one new module; carrier amendments (constructor arity or renames of
anything a seat imports) run in exclusive serialization windows between waves;
additive definitions in shared modules are safe during flight. A statement that
resists proof is a STOP, never a reword.

**Phase 5 — Adjudicate and integrate.** Verification happens on the MERGED state:
full rebuild, all gates, name-for-name axiom comparison. Seat findings are logged
(seats are also scouts — their findings sections are refutation-wave output arriving
through an implementation channel). Integration is closed at merge; every model
change gains a differential harness script the same day; merged trees and branches
are deleted immediately; ledgers update.

**Phase 6 — Audit.** The cycle's entry is appended to `audit/`: ledger snapshot,
commit trail, observations, failure modes with lessons, and proposed standing
amendments — including amendments to this procedure.

## 3. Cycle rules

1. Waves are operator-fired. One standing exception: a falsification finding opens a
   grill immediately, without waiting for a scheduled wave.
2. Refutation and implementation waves may overlap. **Grill phases do not**: at most
   one open docket, because rulings serialize through the operator and a split docket
   is how contradictory amendments arrive.
3. No push leaves the repository without the dual-host gate; the pre-push hook
   enforces the posture mechanically (audit day-one §6.2).

## 4. Roles

- **Operator** — rules, fires waves, dictates theses. The only source of design
  authority.
- **Coordinator** — pins statements, writes briefs and dockets, adjudicates merges,
  maintains the records. Holds no design authority; recommends.
- **Scouts** — advisory, pre-grade, receipts-or-UNVERIFIED. Attack and measure.
- **Seats** — implement against frozen pins. Report findings.
- **Machine instruments** — the gates, the differential harness, the mechanical
  ledger (§8). Standing falsifiers; the only carriers of trust for agent output.

## 5. The monotonicity invariant

The gates make the loop a ratchet: the axiom allowlist never widens silently; the
opaque/unsafe scan never passes a new offender; a proved theorem never leaves the
ledger except by declared amendment; the harness never loses a script; a falsified
statement's conditional form must cite its falsification. Grade inflation is the
failure mode the whole apparatus exists to prevent: no soundness word without its
named judgment (estate C5).

## 6. The findings ledger

`audit/FINDINGS.md` is the program's append-only findings log. Every substantive
finding — from a scout, a seat, the harness, or the coordinator — receives an
`F-<n>` row at adjudication or grill time. Rulings and amendments cite F-numbers.

Row schema: `| F-n | date | source | finding (one sentence) | receipt | disposition |`.
Immutability: rows are never deleted or reworded; the disposition cell is updated
exactly once, from `OPEN` to its resolution with the resolving commit or ruling.
A future refutation wave may be briefed against a disposition by its F-number.

## 7. The document registry

What each artifact holds, how it is used, and how it may change. A document not in
this registry (or the estate's own law) has no standing in gated work.

| Artifact | Holds | Used for | Update rule | Schema |
|---|---|---|---|---|
| `KICKOFF.md` | program record: theses, case-study synthesis, ruling waves (R-, G-series) | orientation; historical record — ruling authority lives in `RULINGS.md` (W3-1) | append numbered sections per thrust or wave; existing text changed only by dated addendum | numbered §; ruling tables carry an authority column |
| `STORE-MODEL.md` | the model specification, normative and present-tense: problem, scenario, information model, semantic interface, legality construction, required behavior with formal traces, invalid cases, boundary cases, exclusions | the model's single authority for current behavior; statement pinning reads it | amendment only (Q10 discipline): a semantic change lands as a dated entry in `RULINGS.md` and the affected normative text updates in the same commit, citing it; falsifications recorded in `RULINGS.md`, never erased | §1–§9 fixed per the W3-6 ratified skeleton (existing sections until migration step 5); promise statuses regenerated from `LEDGER.md`, never hand-edited |
| `STORE-SHELL.md` | the executable-store specification: claim ladder, IO whitelist, layout, boundary, harness, delivery records | the shell's single authority | delivery records append to §9 (until `LEDGER.md`'s live-build side covers deliveries); rung or whitelist changes only by ruling, recorded in `RULINGS.md` | §1–§9 fixed; §8 links to `RULINGS.md` (W3-1) |
| `MAPPING.md` | the Effect-variant disposition table, admission rules, minted-id register | committed data the generator transcribes; admission decisions at the boundary | a row changes only when its authority lands, cited in the row | one row per disposition; columns variant/disposition/form/authority |
| `PROCEDURE.md` | this loop | how work is conducted | audit §6 proposal → operator ratification, only | §1–§9 fixed |
| `dispatch/*.md` | one worktree brief per dispatch: mission, law, pins, report format | the seat's complete instruction; historical record of what was asked | immutable after dispatch; corrections are a new brief | mission / law / method / done-means / report |
| `audit/*.md` (entries) | per-session record: ledger snapshot, commit trail, workflow observations, failure modes, standing-amendment proposals | the learning record; procedure amendments originate here | append-only series; an entry is immutable once committed except §6 proposed→ratified flips | §1 state, §2 trail, §3 workflow, §4 worked, §5 failures+lessons, §6 amendments, §7 numbers |
| `audit/FINDINGS.md` | the F-numbered findings ledger | citation target for rulings, amendments, and refutation briefs | append rows; one-time disposition update per row (§6) | the §6 row schema |
| `research/*.md` | survey reports and probes from literature/evidence waves | pre-ratification evidence | frozen at delivery; superseding evidence is a new report | report-internal; must carry receipts |
| `LEDGER.md` (§8, planned) | the machine-extracted proved ledger, both sides, plus the W3-4 promise-status join | the mechanical statement of what is proved and gated | REGENERATED only; hand edits are violations the diff catches | generated; banner line 1 |
| `RULINGS.md` | every dated ruling, amendment narrative, and falsification record from 2026-08-25 onward; prior records migrate at W3-6 step 5 | the sole ruling authority (W3-1); rulings and amendments cite entries here | append-only dated entries; an entry is immutable once committed; supersession is a new entry citing the old | one entry per docket or ruling, W-numbered items |
| `CONTEXT.md` (planned, W3-6 step 2) | the context's vocabulary: minted terms and rules, estate minting shape | term authority; the R-1 context home | enters and amends by domain-modeling + grilling only (C4) | one entry per term: name, kind, carrier/judgment form, obligations, avoid-list |

Estate-level law (`AGENTS.md`, `TOOLS.md`, `KINDS.md`, `CLAIM-GATES.md`) is not
respecified here; this registry defers to it. TOOLS.md admission precedes any new
instrument's output entering gated work.

## 8. The mechanical ledger (specified; implementation owed)

Hand-maintained proved-lists drift. The ledger is therefore extracted, not written,
and it covers **both sides**:

- **Model side** — from the `formal/entity-store` build log: the gate line (constant
  count) and every `#print axioms` report in the central `Gates.lean` block, parsed
  into theorem → axiom-set rows.
- **Live-build side** — from the shell build log and harness run: the G-S1…G-S4 gate
  lines, the enumerated IO whitelist, and the per-script harness results.

Mechanism (the Stage-2 pattern, already proven in-house): a deterministic extractor
reads the two logs and the harness output and emits `LEDGER.md` as committed text —
banner on line 1, byte-deterministic, no timestamps. The check is regenerate-and-diff;
elaboration-time or read-at-build alternatives are disqualified by the measured Lake
staleness hole (KICKOFF §12). The ledger regenerates at every adjudication; the
monotonicity invariant (§5) becomes checkable by diffing consecutive ledgers.

Until the extractor lands (named seat: **ledger-extractor**), the README tables in
`formal/entity-store` and the spec §9 delivery records are the interim hand ledger,
flagged as such.

## 9. Amending this document

Propose in an audit entry §6; the operator ratifies; the change lands citing the
audit entry and, where applicable, the F-numbers that motivated it. This document
holds no claim-bearing content: nothing in it may be cited as evidence that any
particular theorem is proved — that is the ledger's job.

# R-G — the seams the cutover crosses: a friction report

**Status: G0 ADVISORY, 2026-08-25. This document decides nothing; the rulings are the
operator's.** Architecture scouting only. No domain question is answered here — R-2, the
digest seam, the whitelist question, and the M18 seat are the operator's docket, and they
are named below only where a candidate *depends* on one. No file was modified except this
one.

**Lane:** the seams a gated, station-by-station cutover to an Effect TypeScript production
implementation would have to cross, with the Lean tree as reference/oracle. Stations, as
the brief names them: **wire codecs**, **digest**, **canon/admission**, **store engine**,
**names**, **service surface**, **differential-harness runner**.

**Vocabulary.** Domain terms are the estate glossary's
([CONTEXT.md](../../../docs/entity-store/CONTEXT.md)): *Admissible*, *verdict / environment
fault*, *StoreFault*, *canonical spelling*, and the minted rules. Architecture terms are the
codebase-design vocabulary: *module*, *interface*, *seam*, *adapter*, *depth*, *leverage*,
*locality*, the *deletion test* ("would deleting it concentrate complexity, or just move
it?"), and "one adapter = hypothetical seam, two = real".

**Sources read in full:** `docs/entity-store/{CONTEXT,RULINGS,STORE-SHELL,LEDGER}.md`;
`formal/entity-store/E2/{Core,Encode,Model,Admission,Obligations,Graph,Wf3,Gates,Correspondence}.lean`
and the headers of every other `E2/*.lean`;
`experiments/entity-store-shell/Shell/{Verbs,Boundary,Store,Model,Harness,Script,Carrier,Render,Hex,Hash,Cli,Encode,Gate,Sexp}.lean`;
`experiments/entity-store-shell/{README.md,lakefile.toml,harness/*.script}`;
`experiments/entity-store-{ledger,generate,extract}/` (READMEs and `src/`); `mise.toml`;
`docs/entity-store/MAPPING.md` (the table, for station scope).

**Method note.** The eight frictions the brief named were each tested against the source
before being written up. Two came back **partly refuted** and are recorded that way (C-9 on
`runVerb`'s width; C-7 on the script language). The other six confirmed, several harder than
the brief supposed.

---

## 0. What is already good, so the friction below is read in proportion

The estate does not have an architecture problem. It has a **third-adapter problem**, and
those are different. Three things are already right, and each is the reason a candidate
below is cheap rather than expensive:

- **`Shell/Verbs.lean`'s `runVerb` is a genuine seam** — `StoreView → Verb → Outcome × List
  Effect` (`Shell/Verbs.lean:229`), pure, total, with both adapters (`Shell/Model.lean:64-66`,
  `Shell/Store.lean:267-271`) reduced to *materialize a view* and *interpret an effect*. Two
  adapters exist, so this is a real seam, not a hypothetical one.
- **The core is called, never re-implemented.** The boundary's canonicity test is the core's
  own `preimageS`/`preimageE` byte-compared (`Shell/Boundary.lean:52-56, 187`), and the
  admission verdict goes through Admission's named surface rather than its clause predicates
  (`Shell/Boundary.lean:90-92`), which is what makes `wfsB_iff` (`E2/Admission.lean:60`) and
  `schemaAdmissionClause_none_iff` (`E2/Admission.lean:81`) load-bearing rather than
  decorative.
- **The gates are mechanical, not asserted** — `#e2_opaque_scan` (`E2/Gates.lean:29-52`),
  `#shell_gates` G-S1…G-S5 (`Shell/Gate.lean:133-203`), and a byte-compared generated ledger
  (`mise.toml:27-33`).

Everything below is about what happens when a **third** adapter arrives.

---

## C-1 — The differential harness has no runner seam, and cannot reach an out-of-process runner at all

**Station:** differential-harness runner. **Strength: STRONG.**

**Files.** `Shell/Harness.lean:29-48` (`runScriptModel`), `:51-82` (`runScriptDisk`),
`:85-93` (`firstDivergence`), `:102-111` (`runScriptBoth`), `:127-156` (`runHarness`).
Supporting: `Shell/Gate.lean:72-98` (the IO whitelist by enumeration),
`docs/entity-store/STORE-SHELL.md:263-270` (the BLOCKED items and their reason).

**Problem.** Two frictions, and the second is the hard one.

*(a) The step loop is written twice.* `runScriptModel` (`Harness.lean:29-48`) and
`runScriptDisk` (`Harness.lean:51-82`) are the same algorithm — parse a step, run an
assertion or a verb, take the step's address, push `(addr, code)` into the `AddrEnv`, emit
`transcriptLines idx …` — expressed once as a pure `Except` recursion and once as an `IO`
loop over mutable locals. Everything that is genuinely per-adapter is three lines
(`m.run v` at `:43` versus `r.run v` at `:75`); everything else is duplicated, including the
assertion-abort rule (`:39-40` versus `:70-71`), the "assertion without an outcome"
unreachable arm (`:44`, `:78`), and the index/transcript bookkeeping. A third adapter is a
third copy of that loop.

*(b) The comparator is binary, by type.* `runScriptBoth` (`Harness.lean:102-111`) takes
exactly one `StoreRoot` and hard-codes `runScriptModel` beside it; `firstDivergence`
(`Harness.lean:85-93`) is `List String → List String → Option String`. There is no runner
list, no runner name in the failure render, and no n-way compare. `ScriptResult`
(`Harness.lean:95-99`) carries one transcript, which is silently *the model's* — at
`Harness.lean:107` a disk-side script error is reported with `modelLines` as the transcript.

*(c) The seam does not reach out of process, and cannot under SHELL-v0.* The header comment
at `Harness.lean:14-16` and the README at `experiments/entity-store-shell/README.md:219` both
say the disk side runs "through the CLI codepaths". **It does not**: `runScriptDisk` calls
`StoreRoot.run` directly (`Harness.lean:75`), and `Shell.runCli` has exactly one caller in
the whole package — `Main.lean:3` (`grep -rn runCli --include=*.lean` returns two lines:
that call and the definition at `Shell/Cli.lean:84`).
A TypeScript runner is necessarily a separate process, and the shell has **no process
primitive**: the enumerated whitelist (`Shell/Gate.lean:72-98`) contains no `IO.Process`, and
G-S3 fails the build on any unlisted `IO.*` constant (`Shell/Gate.lean:193-195`). The
package's own `Owed` list already records this as a live question
(`experiments/entity-store-shell/README.md:502-503`).

**Deletion test.** Inverted: there is no runner module to delete. Today's two runners are
*two adapters against an implicit seam that has never been named*. The friction is a missing
module, and the diagnostic is that adding an adapter costs a copy of the loop rather than an
instance of an interface.

**Solution sketch.** Name the runner seam as a small record of per-adapter operations —
initialize, run one verb, and (only for an out-of-process adapter) tear down — and drive one
step loop over it, so `runScriptModel`/`runScriptDisk` become two values of that record
rather than two functions. Then widen the comparator from a pair to a list of named runners
and report the first position where any two disagree, naming both. The out-of-process leg
is a *separate* question and should be sequenced after: it is a whitelist ruling (the same
one F-12 and W3-20's BLOCKED items already ask for), and it is worth noting that the driver
does not have to live in Lean — a driver outside the shell that spawns `estore` and the TS
binary needs no whitelist change at all, at the price of moving the acceptance gate out of
`lake exe harness`.

**Benefits.** *Leverage*: one loop, N adapters — the cutover's per-station gate becomes
"add a runner value", not "add a runner". *Locality*: the assertion-abort rule and the
transcript shape stop existing in two places that must be edited together. *Testability*:
an n-way comparator makes "TS agrees with model but not with disk" a distinguishable
verdict, which is exactly the diagnosis a station-by-station cutover needs.

**Carries across the gate.** This is the instrument that carries *everything else*. It is
STORE-SHELL §1 rung 1 (`docs/entity-store/STORE-SHELL.md:37-40`) and the v0 acceptance gate
(SH7, `:199`). Concretely, the 26 committed scripts are the executable form of
`M12_dedup`/`M12E_dedup` (script `01`, `02`), `M15_faithful_schema`/`M15_faithful_entity`
(script `05`), `M8_wf1` (`06`), `wfsB_iff` and the W3-17/W3-18 clause table (`12`–`17`),
`M10_wf3` + `ObligationTopoSound` (`18`, `19`), and the verdict/environment-fault taxonomy
(`23`). Without a runner seam, none of those transfer to a third implementation except by
re-authoring the harness.

**Depends on an operator docket item:** the whitelist ruling for a process surface (F-12;
`README.md:502-503`), *if* the driver is to stay inside the Lean harness.

---

## C-2 — Nothing on disk pins a byte or an address across implementations; the differential is self-referential

**Station:** wire codecs and digest (and, through them, every other station).
**Strength: STRONG.**

**Files.** `experiments/entity-store-shell/harness/*.script` (26 files, no expected-output
file among them); `Shell/Script.lean:152-157` (`stepAddr`), `:172-173` (`transcriptLines`);
`Shell/Harness.lean:102-111` (the comparison is in-memory and discarded);
`Shell/Hash.lean:35-41` (the only committed digest literals);
`harness/12-wfs-closed.script:39` (the only committed *store* address);
`harness/09-hostile-bytes.script:13-14` and `harness/18-acyclic-order.script:68-69` (the only
committed pre-image byte strings).

**Problem.** The harness compares runner (a) against runner (b) **at run time** and writes
nothing down. Both runners compute an address through the same `Shell.H`
(`Shell/Hash.lean:24`) and take a put's address from `stepAddr` = `H b` (`Shell/Script.lean:154-156`),
so a change to `encSchema`, to `canonS`, or to the digest moves **both** transcripts
identically and the harness stays green. LEDGER.md records the run's *shape* ("26 scripts,
all model/disk observables identical", `docs/entity-store/LEDGER.md:131`) and the transcript
*line counts* (`:103-128`) — not the transcripts.

What exists today, in full:

| Pin | Where | What it fixes |
|---|---|---|
| SHA3-512 of `[]` and `[0x37,0xd5,0x18]`, in address hex | `Shell/Hash.lean:38-41` (`#guard`) | the digest and the hex spelling — **not** any pre-image |
| `preimageS (.prim .int) = 01003002` | `harness/09-hostile-bytes.script:13-14` | one encoding, inline in a comment |
| `preimageS (.ref …) = 010037 40 …` | `harness/18-acyclic-order.script:68-69` | one encoding, inline in a comment |
| `H (preimageS (.var 0))` = one 128-hex literal | `harness/12-wfs-closed.script:39` | **the only committed store address in the estate** |
| render/parse round-trip on 9 carriers | `Shell/Gate.lean:223-231` (`#guard`) | the fixture syntax, not the wire |

The line-count column of the ledger (`LEDGER.md:103-128`) is a weak proxy: it would catch a
transcript that changed *length*, and nothing else.

**Deletion test.** Not applicable — this is a missing artifact, not a misplaced one. The
sharper diagnostic: today's harness cannot fail for the one reason the cutover most needs it
to fail, namely "the TS implementation computes a different address for the same carrier".

**Solution sketch.** Commit what the harness currently throws away: for each script, the
expected transcript, byte-for-byte, produced by the reference tree and regenerated under
`mise run gen` so the existing `git diff --exit-code` leg (`mise.toml:39`) turns any drift
into a red build. That single artifact converts the differential from an intra-Lean
consistency check into a cross-language conformance suite, because a transcript already
contains every address, every rejection clause, every violation line, and every exit code
(`Shell/Script.lean:172-173`, `Shell/Boundary.lean:264-276, 413-419`). Separately and more
cheaply, a small committed vector file at each of the two lower stations — carrier → wire
bytes, and pre-image bytes → address hex — would let a TS codec be gated *before* any store
engine exists, which is what "station-by-station" means.

**Benefits.** *Leverage*: one generated artifact gates every station at once, and it costs
no new instrument — the `gen` + `git diff --exit-code` machinery already exists. *Locality*:
the byte facts stop being scattered through fixture comments. *Testability*: a TS station can
be red or green on its own, before it is wired to anything.

**Carries across the gate.** Transcript vectors carry the observable side of
`M12_dedup`/`M12E_dedup`, `M15_*`, `M8_wf1`, `wfsB_iff` + the clause table, `M10_wf3`, and
the verdict taxonomy. Codec vectors carry `encSchema_inj`, `encValue_inj`, `M4a_schema`,
`M4a_value`, `decNat_encNat`, `version_byte_separates` and `version_byte_separates_bump`
(`LEDGER.md:26-27, 18-20, 38-39`) — none of which is a statement a TypeScript implementation
can inherit, but all of which become *checkable* against the reference once the vectors
exist. Address vectors carry `directionA` and `kind_separation` (`LEDGER.md:12-13`) in their
observable form.

**Note on the estate's own rule.** `optimization-never-trust-source` (CONTEXT.md) says a
cache must be deletable with no observable change. A committed transcript is not a cache and
must not become one: it is an *expectation*, regenerated from the reference and compared, and
it should never be read as a substitute for running the reference.

---

## C-3 — `admissibleReport` and `checkReport` are two decision surfaces for one judgment, and one of them has no callers

**Station:** canon/admission. **Strength: STRONG.**

**Files.** `E2/Admission.lean:103-132` (`Admissible`), `:136-209` (the decided clauses:
`addrListNodupB`, `hashedB`, `admittedB`, `refClosedB`, `isSchemaPreimageB`, `schemaTypedB`),
`:215-235` (`AdmissionReport`, `admissibleReport`), `:240-242`
(`ObligationAdmissibleReportDecides`). Against them: `Shell/Boundary.lean:309-324`
(`scanObject`), `:346-356` (`cycleNodes`), `:368-409` (`checkReport`), `:238-276`
(`Violation` and its render).

**Problem.** The judgment `Admissible` has six clauses (`E2/Admission.lean:103-132`) and the
core carries a decision procedure for all six (`admissibleReport`, `:229-235`). The shell
carries a **second** decision procedure for the same six, written independently:

| Clause | Core decides it at | Shell decides it at |
|---|---|---|
| `functional` | `addrListNodupB (Keys σ)` `:230` | implicit in the directory (one file per name) |
| `hashed` (WF1) | `hashedB` `:143-144` | `if H b ≠ a` `Boundary.lean:310` |
| `admitted` | `admittedB` `:164-181` | `classify` + `admissionClause` + byte-compare `Boundary.lean:311-317` |
| `closed` (WF2) | `refClosedB` `:184-188` | `p.refs.filter …` `Boundary.lean:319` |
| `schemaTyped` | `schemaTypedB` `:197-209` | `resolveSchema H σ sAddr` `Boundary.lean:321-322` |
| `acyclic` | `(topoOrder σ).isSome` `:235` | `(topoOrder σ).isSome` + `cycleNodes` `Boundary.lean:392` |

A grep for `admissibleReport`, `admittedB`, `hashedB`, `refClosedB`, `schemaTypedB` and
`AdmissionReport` across `formal/` and `experiments/` returns **exactly one hit outside
`E2/Admission.lean` itself, and it is a comment** — `Shell/Boundary.lean:87`, quoting the
CONTEXT avoid-list about not bypassing `admissibleReport`. The shell honours that rule at the
*carrier* level (it does go through `schemaAdmissionClause`/`valueAdmissionClause`,
`Shell/Boundary.lean:90-92`) and does not honour it at the *store* level, where it reaches
past the report to `classify`, `H`, `σ.find`, `resolveSchema` and `topoOrder` directly.

Only one of the two is aligned with the model. `admittedB` (`E2/Admission.lean:164-181`)
re-implements `classify` inline over the raw byte list; `Shell.classify`
(`Shell/Boundary.lean:65-74`) does it through `stripPre`. They agree today. Nothing makes
them agree tomorrow. And `ObligationAdmissibleReportDecides` — the theorem that would make
*either* of them mean `Admissible` — is stated and unproved (`E2/Admission.lean:240-242`,
echoed in `docs/entity-store/STORE-SHELL.md:287`).

**Deletion test — the sharp one.** Delete `admissibleReport`, `AdmissionReport`,
`AdmissionReport.clean`, `hashedB`, `admittedB`, `refClosedB`, `isSchemaPreimageB`,
`schemaTypedB` and `addrListNodupB` today and **nothing that runs changes**. That is the
signature of complexity that has been *moved* (into a module that owns the vocabulary) rather
than *concentrated* (into a module that anyone calls). The verdict is not "delete it" —
`ObligationAdmissibleReportDecides` needs a subject, and W3-3 gave `E2/Admission` the
judgment deliberately. The verdict is that the shell's `checkReport` is currently the real
decision surface and the core's is aspirational, which is the reverse of what W3-3 ruled.

**Solution sketch.** Close the gap in one direction rather than leaving two surfaces:
either the scan's per-clause tests become calls into the core's decided clauses — with
`checkReport` keeping only the diagnosis vocabulary (`Violation` and its per-node cycle
witness, which `admissibleReport`'s `Bool` fields deliberately cannot carry) — or the core's
report is restated over the shell's per-object decomposition. The first direction is the one
W3-3 already points at, and the diagnosis-versus-verdict split is a real difference worth
keeping: a `Bool` per clause is what a proof consumes, a `Violation` list is what an operator
reads. The seam to name is "the decided clause", not "the report".

**Benefits.** *Leverage*: `ObligationAdmissibleReportDecides`, once proved, would then say
something about what the shell actually runs — today it would not. *Locality*: one place
answers "what does the scan check", instead of a core module and a shell module that must be
read together to be sure. *Testability*: a TS implementation gets one clause list to satisfy,
and a per-clause conformance target rather than a whole-report one.

**Carries across the gate.** This is the seam that carries `Admissible` itself and therefore
SH5 as narrowed (`docs/entity-store/STORE-SHELL.md:197, 110-118`): `wfsB_iff`,
`schemaAdmissionClause_none_iff`, `valueAdmissionClause_none_iff` (proved,
`E2/Admission.lean:60, 81, 91`), plus the three stated-unproved obligations that hang off it
— `ObligationAdmissibleReportDecides`, `ObligationTopoComplete` (`E2/Graph.lean:118-119`) and
`ObligationM19_transport` (`E2/Admission.lean:271-276`). A TS `check` that does not decide
the same six clauses is not deciding `Admissible`, whatever it prints.

---

## C-4 — `StoreMap` is a transparent list whose *order* carries a proved theorem, and the shell re-orders it

**Station:** store engine. **Strength: STRONG.**

**Files.** `E2/Model.lean:460-461` (`abbrev Bytes` / `abbrev StoreMap`), `:463-465`
(`StoreMap.find`), `:469-472` (`putPre` conses), `:484-487` (`getChecked`);
`E2/Graph.lean:23-24` (`Keys`, with the "newest first — `putPre` conses" comment), `:43-46`
(`refsAt`), `:73-81` (`kahnReady`/`kahnSplit`); `E2/Wf3.lean:49-60` (`ObligationM10_rank`);
`E2/Admission.lean:143-144, 184-188, 197-209, 230-235` (`σ.all`, `Keys σ` used directly);
`Shell/Boundary.lean:287-293` (`StoreView.normalize`), `:295` (`toMap`);
`Shell/Store.lean:267-271` (`readView` before every verb).

**Problem.** Three things, and the third is the one the brief did not ask about and is the
most consequential.

*(a) The representation is not behind an interface — it is an `abbrev`.* `StoreMap` is
`abbrev StoreMap := List (Address × Bytes)` (`E2/Model.lean:461`), so `List`'s whole API is
available and is used: `σ.all` at `E2/Admission.lean:144, 185, 198, 232`, `σ.map` at
`E2/Graph.lean:24` and `Shell/Model.lean:51`, `List.partition` at `E2/Graph.lean:81`,
`(Keys σ).length` at `E2/Graph.lean:103` and `Shell/Boundary.lean:356`. There is no
`StoreMap` module: `find`, `putPre` and `getChecked` are three functions in the middle of
`E2/Model.lean`, and everything else reaches the list.

*(b) `find` is linear, and the shell re-scans per verb.* `StoreMap.find`
(`E2/Model.lean:463-465`) walks the list. `StoreRoot.run` calls `readView` before **every**
verb (`Shell/Store.lean:268`), and `readView` reads and hashes every object file
(`Shell/Store.lean:171-182`); `runVerb` then binds `checkReport view` (`Shell/Verbs.lean:231`),
which runs `scanObject` over every object, each of which calls `σ.find` per reference
(`Shell/Boundary.lean:319`). `cycleNodes`/`kahnLoop` calls `refsAt σ a` per node per round
(`E2/Graph.lean:74, 96`), and `refsAt` is a `find` (`E2/Graph.lean:44`). So a `get` on an
n-object store costs n file reads, n SHA3-512 digests, n decodes, and a graph pass whose
worst case is cubic in n. That is a defensible v0 posture — the estate's rule
`optimization-never-trust-source` (CONTEXT.md) and W3-21 both say an amortization arrives
only behind a measurement — but it is a fact the cutover must state rather than inherit.

*(c) The list ORDER is load-bearing for a proved theorem, and the shell destroys it.*
`ObligationM10_rank` (`E2/Wf3.lean:58-60`) says `∀ a b, Edge σ a b → idxOf (Keys σ) a <
idxOf (Keys σ) b` — the store list *is* a reverse topological order, because `putPre` conses
(`E2/Model.lean:471`). It is proved (`M10_rank`, `LEDGER.md:33`). But
`StoreView.normalize` sorts objects by address hex (`Shell/Boundary.lean:288`) before
`toMap` hands them to `runVerb` and `checkReport` (`Shell/Verbs.lean:232`,
`Shell/Boundary.lean:370`), and that sort is deliberate and correct — it is
`host-relation-neutrality` holding on the order half (`Shell/Verbs.lean:250-254`). The
consequence: **the shell's `σ` is not a `putPre`-ordered list, so `M10_rank`'s conclusion
does not describe it.** `M10_wf3` (acyclicity) survives, because `Acyclic` is
order-independent (`E2/Graph.lean:61`); the *rank* does not. A production store engine in any
language — hash map, directory listing, database — is in the same position.

**Deletion test.** Applied to the missing module: there is no `StoreMap` module to delete,
and its absence is what allows (a) and lets (c) go unremarked. Applied to `normalize`:
deleting it would concentrate complexity badly (every observable would inherit `readDir`
order), so it stays — which is the point. The friction is that two different objects are
wearing one type name: the model's *insertion-ordered history*, over which `M10_rank` is
true, and the shell's *normalized snapshot*, over which it is not.

**Solution sketch.** Two independent moves, in this order. First, distinguish the two
readings at the type level — a name for the ordered history (what `Reachable` builds and
`M10_rank` describes) and a name for the normalized candidate (what a scan opens and
`Admissible` describes) — so that a theorem quantified over the first cannot be silently read
about the second; the `Admissible`/`Reachable` split already made exactly this distinction at
the *judgment* level (W3-2, `E2/Admission.lean:7-11`) and the carrier has not caught up.
Second, and only after a measurement per W3-21, put the lookup behind a small named interface
so the representation can change without touching `Graph`, `Admission` or `Boundary` — the
address-commits-to-encoding rule (CONTEXT.md) already licenses exactly this: storage may
change freely while bytes-as-addressed stay fixed.

**Benefits.** *Locality*: the order question is answered in one place instead of being
implicit in a `cons` and a `mergeSort` two packages apart. *Leverage*: a TS store engine gets
told which theorems it can carry (`M10_wf3`, `M13_frame`, `M14_get_put_fresh`, `M9_wf2`) and
which it cannot (`M10_rank`, unless it keeps an insertion log) — instead of discovering it.
*Testability*: the `order` verb becomes the *only* order observable, which is already what it
is for (`Shell/Verbs.lean:241-249`).

**Carries across the gate.** `M13_frame`, `M14_get_put_fresh`, `M9_wf2`, `M15_fresh`,
`M15_faithful_schema`, `M15_faithful_entity`, `M11_comm`, `reachable_keys_nodup`,
`M11_comm_keys_nodup`, `M10_wf3` (`LEDGER.md:16-17, 21-24, 33-37`) — all statements about a
`StoreMap`. And the one that visibly does **not** cross without a decision: `M10_rank`
(`LEDGER.md:33`), whose currency is `idxOf (Keys σ)`.

---

## C-5 — The wire format is a language-neutral artifact discoverable only by reading Lean, and it is spread across four modules

**Station:** wire codecs (and digest, for the pre-image framing). **Strength: STRONG.**

**Files.** `E2/Encode.lean:29-35` (`encNat`), `:38-49` (`encStr`, `encInt`, `encAddress`),
`:71-92` (value tags 0x10–0x16), `:94-107` (check tags 0x20–0x21), `:109-143` (schema tags
0x30–0x3C); `E2/Obligations.lean:15-17` (`versionByte`, `kindSchema`, `kindEntity`), `:19-26`
(`preimageS`, `preimageE`); `E2/Canon.lean:105-135` (the canonical field order the encoder
consumes); `Shell/Hex.lean:17-64` (the address's hex spelling and its 64-byte width),
`:104-112` (the name plane's hex spelling); `Shell/Store.lean:29-40` (the directory layout).
Against them: `docs/entity-store/STORE-MODEL.md:40-41` (the format described by *shape*
only — "discriminator byte per node, unbounded LEB128-style Nat frames"), `:275`
(0x3B/0x3C, the only tag values named in a ratified document).

**Problem.** A TypeScript implementation must reproduce these bytes exactly or every address
in the store moves. The facts it needs are: 13 schema tags, 7 value tags, 2 check tags, the
`encNat` frame shape, the string frame (UTF-8 byte count then bytes, no normalization,
`E2/Encode.lean:37-40`), the int sign discriminator (`:43-45`), the address frame (`:47-49`),
the pre-image prefix (`E2/Obligations.lean:19-26`), the canonical field order
(`E2/Canon.lean`), the digest and its width (`Shell/Hash.lean:24`, `Shell/Hex.lean:54-57`),
and the two hex spellings (`Shell/Hex.lean:59-64, 104`). **Nine of those ten live in Lean
source or in Lean-source comments.** The ratified corpus describes the format's shape but
never enumerates a tag; the only tag values in a ratified document are 0x3B and 0x3C, and
they are there because they were an amendment (`STORE-MODEL.md:275`).

There is also a second, unrelated tag numbering — `E2.Correspondence.tag` assigns
`0…12` to the same 13 constructors (`E2/Correspondence.lean:35-49`) — which is a *carrier
order* pin for the generation lane, not a wire tag. Nothing in either module says so. A
reader coming to the estate to implement a codec has two integer tables for one inductive and
no statement of which is on the wire.

**Deletion test.** `E2/Correspondence.lean` looks shallow (55 lines, twelve one-line
aliases), but it passes: deleting it would *concentrate* complexity, because the exhaustive
`tag` match is what makes a new constructor fail elaboration in the generation lane
(`experiments/entity-store-generate/README.md:3-6`), and `tags_distinct` is an axiom-clean
ledger row (`LEDGER.md:11`). It is an instrument, not a module. The friction is that it is
not *labelled* as one.

**Solution sketch.** Promote the byte format from Lean-comment status to a committed,
generated artifact — extracted from `E2/Encode.lean` and `E2/Obligations.lean` by the same
kind of extractor the ledger lane already runs (`experiments/entity-store-ledger/src/extract.ts`),
so it is a derived file under `mise run gen` rather than a second maintained copy (which
W3-4's "no second maintained copy of a promise" rule would otherwise forbid). Pair it with
the codec vectors from C-2 — the table says what the bytes are, the vectors prove an
implementation got them right — and give `Correspondence.tag` a one-line statement that it
is the carrier-order pin and not the wire tag.

**Benefits.** *Leverage*: one generated file is the codec station's whole specification, and
the existing `gen` + `git diff --exit-code` leg (`mise.toml:35-43`) makes drift a red build.
*Locality*: the format stops being assembled from four modules in two packages by whoever
needs it. *Testability*: the codec station can be gated before any store exists.

**Carries across the gate.** `encSchema_inj`, `encValue_inj` (`LEDGER.md:26-27`),
`M4a_schema`, `M4a_value`, `decNat_encNat` (`:18-20`), `version_byte_separates` and
`version_byte_separates_bump` (`:38-39`), `Correspondence.tags_distinct` (`:11`),
`intraKindFaithful` (`:40`), and — through `preimageS`/`preimageE` — `directionA` and
`kind_separation` (`:12-13`). Also the minted rule `address-commits-to-encoding`
(CONTEXT.md), which is precisely the statement that this artifact, and not the storage
layout, is what a cutover must hold fixed.

---

## C-6 — Directory-entry classification is transcribed once per adapter; a third adapter makes it three

**Station:** store engine and names. **Strength: WORTH EXPLORING.**

**Files.** `Shell/Verbs.lean:122-130` (`PlacedEntry`), `:132-167` (`placedEntry`, whose own
doc comment says it "is written as a TRANSCRIPTION of" the disk reader, "clause for
clause"), `:169-181` (`StoreView.withPlaced`); against `Shell/Store.lean:167-219`
(`readView`). Shared, and correctly so: `Shell/Hex.lean:76-78` (`addrOfFileBytes`),
`Shell/Verbs.lean:70-72` (`nameOfFileName`). Context:
`docs/entity-store/STORE-SHELL.md:260-270` (the two BLOCKED shapes).

**Problem.** W3-20 got the *names* plane right: `nameOfFileName` and `addrOfFileBytes` are
single functions both adapters call, and the reasoning is written down
(`Shell/Verbs.lean:65-69`, `Shell/Hex.lean:71-75`). The *objects* and *obligations* planes are
not: `placedEntry`'s objects arm (`Shell/Verbs.lean:143-148`) and `readView`'s objects loop
(`Shell/Store.lean:174-182`) are two spellings of the same clause order — filename tested for
address-hex first, then regular-file, then read — and the same holds for the obligations
plane (`Shell/Verbs.lean:149-154` versus `Shell/Store.lean:204-214`). The `placedEntry` doc
comment is explicit that the mirroring is deliberate and that the reader's *ordering choices*
had to be copied rather than tidied (`Shell/Verbs.lean:134-139`).

Two adapters make this survivable: a mis-transcription makes the two sides disagree and the
differential fires. Three adapters make it a maintenance surface — and the differential's
coverage here is already partial, because `place` can only create files and directories
(`Shell/Verbs.lean:95-103`), so the symlink and FIFO legs of W3-15's file-type discipline are
hand-exercised only (`STORE-SHELL.md:266-270`).

**Deletion test.** Deleting `placedEntry` would concentrate complexity into the model
adapter (it would have to classify inline) — so it is a real module. The friction is that it
is a *mirror* rather than a *shared* module: the seam exists on the names plane and does not
exist on the other two.

**Solution sketch.** Extend W3-20's own discipline to the remaining two planes: one shared
classifier that takes a plane, a filename, and an entry shape, and returns the row — with both
adapters calling it, exactly as they both call `nameOfFileName` today. The disk adapter keeps
the IO (reading `symlinkMetadata`, reading bytes); the classification stops being IO-shaped
and stops being copied. The BLOCKED shapes are a separate, ruled question and this does not
touch them.

**Benefits.** *Locality*: "what is this directory entry" has one answer. *Leverage*: a third
adapter inherits the classification instead of re-deriving it, which is the same argument
`Shell/Verbs.lean:65-69` already makes for names. *Testability*: the classifier becomes
directly exercisable on shapes `place` cannot create, which is where the differential is
blind today.

**Carries across the gate.** The stray/not-regular half of the scan's `Violation` vocabulary
(`Shell/Boundary.lean:238-262`), which is the observable form of `Admissible.functional` and
of W3-15's file-type discipline (`STORE-SHELL.md:90-100`, `:148-160`), and — on the names
plane — the minted rule `host-relation-neutrality` in its equality half.

---

## C-7 — The script and transcript languages are portable in form but not in status: a grammar in an experiment README, and a transcript format nowhere

**Station:** differential-harness runner. **Strength: WORTH EXPLORING.** *(The brief's
framing is partly refuted: the language is not Lean-coupled.)*

**Files.** `Shell/Sexp.lean:14-22` (the `Sexp` carrier), `:31-70` (tokenizer: `;` comments,
five string escapes, delimiter set); `Shell/Script.lean:64-120` (the verb grammar), `:126-147`
(the step grammar), `:172-173` (`transcriptLines`); `Shell/Carrier.lean:20-69` (`AddrEnv`,
`@N`/`@prev`/`@last`), `:77-202` (the carrier grammar);
`experiments/entity-store-shell/README.md:253-282` (the grammar, in prose).

**Refutation first.** A TS runner *could* parse these scripts. The syntax is
s-expressions with `;` comments, quoted strings with exactly five escapes
(`Shell/Sexp.lean:47-54`), and no Lean-specific construct anywhere; the tokenizer takes
explicit fuel precisely so nothing is `partial` (`Shell/Sexp.lean:4-7`). The verb grammar is
a flat table of about twenty forms (`Shell/Script.lean:64-120`); the carrier grammar mirrors
`Shell/Render.lean` exactly, which is a checked property (`Shell/Gate.lean:223-231`). Nothing
here is a barrier.

**Problem.** Two of *status*, not of design.

*(a) The grammar's only home is an experiment README.* It is written out at
`experiments/entity-store-shell/README.md:253-282` — accurately, and with the plane vocabulary
— but `experiments/` is instrument grade (`STORE-SHELL.md:202-204`), and a grammar a second
implementation must match is a normative artifact. Nothing in `docs/entity-store/` mentions a
script form; the fixtures appear in the ratified corpus only as filenames and line counts
(`LEDGER.md:103-128`).

*(b) The transcript format is specified nowhere at all.* It is one line of code —
`s!"{idx} {src} => code={out.code}"` plus `s!"{idx} | {l}"` (`Shell/Script.lean:172-173`) —
and it is the actual comparison unit of the entire acceptance gate. A second runner must
reproduce it byte-for-byte, including the re-rendered source form (`renderSexp`,
`Shell/Script.lean:25-36`), which normalizes whitespace and re-escapes strings. It is not
described in the README, in STORE-SHELL, or in the LEDGER.

*(c) One assertion is decided at parse time, not at run time.* `assert-code` is checked
inside `sexpToStep` and errors during interpretation (`Shell/Script.lean:142-146`), while
`assert-same`/`assert-differ` are decided by `runAssertion` (`Shell/Script.lean:160-168`). A
second implementation that ran them all at the same phase would produce different transcripts
on failure. The reason for the split is stated and good (`Shell/Script.lean:142-143`); it is
just invisible from outside.

**Deletion test.** `Shell/Sexp.lean` and `Shell/Carrier.lean` both pass — deleting either
concentrates complexity into every caller. The friction is documentary status and one
specification gap, not module structure.

**Solution sketch.** Give the script language and the transcript format a normative home
alongside the transcript vectors of C-2 — the vectors make the transcript format
*self-specifying*, so the document only has to state the grammar, the `@N`/`@prev`/`@last`
resolution rule, and the phase at which each assertion is decided. It costs one document and
no code. The store-aware assertion the package already records as owed
(`README.md:504-508`) should land in the same window if it lands at all, since it is a
grammar change.

**Benefits.** *Leverage*: the same fixtures gate three implementations. *Locality*: the
comparison unit stops being an implementation detail of one `s!` interpolation.
*Testability*: a TS runner can be written against a document rather than against a reading of
`Shell/Script.lean`.

**Carries across the gate.** Everything C-1 carries — this is the *format* half of the
runner seam, where C-1 is the *structure* half.

---

## C-8 — The CLI's verdict-to-exit-code translation sits outside the differential

**Station:** service surface. **Strength: WORTH EXPLORING.**

**Files.** `Shell/Cli.lean:56-58` (`fail` → 2), `:60-63` (`emit` → `out.code`), `:77-82`
(`onStore`, including the uninitialized-store branch), `:84-138` (`runCli`: argument arity,
address-hex validation at `:64-67`, input-file reads at `:69-73`);
`Shell/Store.lean:80-115` (`StoreFault` and `faultOfIOError`);
`Shell/Harness.lean:75` (the disk runner calls `StoreRoot.run`, not `runCli`);
`harness/23-exit-codes.script:12-18` (the fixture's own record that the exit-2 leg is
unreachable from the script language).

**Problem.** The verdict/environment-fault taxonomy is a minted term (CONTEXT.md) and a
ruled contract (W3-15): 0 clean, 1 violations, 2 could not check — and "never fold class 2
into class 1". The **decision** is under test: `runVerb` returns an `Outcome` with a code
(`Shell/Verbs.lean:22-24`) and both runners compare it. The **translation to a process exit
code** is not: it lives in `Shell/Cli.lean` (`fail`/`emit`/`onStore`, `:56-82`), and the
harness never calls `runCli` (`Shell/Harness.lean:75`). Neither is the mapping from
`IO.Error` constructor to `StoreFault` (`Shell/Store.lean:96-115`) — a nineteen-arm match,
deliberately without a catch-all, whose render is the class-2 observable. Script `23`'s own
comment records the gap for the class-2 leg (`harness/23-exit-codes.script:12-18`); the
argument-shape faults (bad arity, non-hex address, missing input file — all exit 2 via `fail`)
are not recorded anywhere as untested.

For a cutover this matters more than it does today, because the service surface is precisely
what a TS implementation would present first: the CLI, and later the v1 wire protocol
(`STORE-SHELL.md:159-163`), whose response codes are the same taxonomy in a different
alphabet.

**Deletion test.** `Shell/Cli.lean` passes as a module — deleting it moves argv handling into
`Main`. The friction is coverage, not structure: a thin adapter that is nonetheless the whole
observable contract for a process caller.

**Solution sketch.** Pull the translation — `Outcome`/`StoreFault` → exit code and stderr
line — out of the IO path into a pure function, so it can be exercised by the same fixtures
that already exercise `runVerb`, and so the v1 wire mapping later becomes a second reader of
one table rather than a second table. The class-2 legs that need a hostile filesystem remain
hand-exercised until the whitelist question (C-1) is ruled; the argument-shape legs need no
filesystem at all and could be pinned immediately.

**Benefits.** *Locality*: the three-way contract has one implementation instead of being
split between a pure `Outcome` and an IO wrapper. *Leverage*: CLI exit codes and v1 response
codes derive from one place. *Testability*: the class-2 render — the thing W3-15 rules must
never quote libuv text (`Shell/Store.lean:69-76`) — becomes checkable without a hostile
directory.

**Carries across the gate.** The verdict / environment fault taxonomy and `StoreFault`
(CONTEXT.md, both minted terms), and W3-15's ruling in full. No proved theorem — which is
itself the finding: the service surface is the station with the least formal cover and the
most direct exposure to a caller.

---

## C-9 — `Shell/Verbs.lean`: the function is deep, the module is doing four jobs

**Station:** service surface and store engine. **Strength: WORTH EXPLORING.** *(The brief's
framing is partly refuted: `runVerb` is not shallow.)*

**Files.** `Shell/Verbs.lean:229-316` (`runVerb`), and the module's other tenants:
`:29-72` (`validName`, `nameOfFileName` — the names plane's admission), `:74-181` (the
`Plane`/`PlaceKind`/`PlacedEntry` vocabulary and the model-side classifier), `:183-218`
(`Effect` and `Verb`), `:220-225` (`flipByte`), `:318-337` (carrier→pre-image assembly,
including the two deliberately non-canonical `-raw` forms).

**Refutation first.** `runVerb` is deep by the usual measure: one function, one small
interface (`StoreView → Verb → Outcome × List Effect`), hiding admission, the scan, the
verification-on-open gate, resolution, and the whole effect vocabulary. Eighty-eight lines
for twelve verbs is about seven lines each, and most of that is the observable's exact text.
Both adapters are thin because of it (`Shell/Model.lean:64-66` is three lines;
`Shell/Store.lean:267-271` is five). Two adapters exist, so it is a real seam.

**Problem.** The *module* is four things: (1) the verb decision, (2) the names plane's
admission rules (`validName`, `nameOfFileName`), (3) the model-adapter's view classifier
(`placedEntry`, `withPlaced` — see C-6), and (4) the fixture byte-assembly helpers
(`schemaBytes`, `schemaBytesRaw`, `entityBytes`, `entityBytesRaw`), of which the `-raw` pair
exists solely to feed fixtures input the boundary must reject (`Shell/Verbs.lean:330-332`).
Each tenant is placed for a stated reason — `nameOfFileName` sits here so both runners call
one function (`:65-69`), the assembly helpers sit here because `runVerb` is what consumes
their output (`:318-324`) — and the reasons are individually good. Cumulatively, "the module
that holds the entire decision content of the shell" (`:4`) also holds the names alphabet,
the harness's classifier mirror, and the fixture tooling's encoder.

The cutover consequence is narrow but real: a TS implementation needs (1) and (2) and does
not need (3) or (4), and cannot tell that from the module boundary.

**Deletion test.** `Shell/Verbs.lean` as a whole passes decisively — deleting it duplicates
the decision content into both adapters, which is the worst outcome available. Applied
tenant-by-tenant, (3) and (4) are the ones whose relocation would *move* rather than
*concentrate*: (3) belongs with whatever C-6 produces, and (4) belongs with the fixture tool
that is its only non-harness consumer (`Shell/Encode.lean:51, 66`).

**Solution sketch.** Leave `runVerb` exactly where it is; it is the estate's best seam. Move
the two tenants that the cutover does not need — the classifier mirror toward C-6's shared
classifier, and the carrier-assembly helpers toward the fixture side — so that the module's
name and its contents agree, and so that "what must a second implementation reproduce" is
answerable by reading one file. This is hygiene, not repair, and it should ride whichever of
C-6 or C-2 lands first rather than be a window of its own.

**Benefits.** *Locality*: the decision module contains the decision. *Leverage*: small — this
buys navigability, not capability. *Testability*: unchanged.

**Carries across the gate.** `runVerb` is the carrier of the entire observable contract:
every rejection render (`Shell/Boundary.lean:113-124`), every violation render (`:264-276`),
the verification-on-open gate that makes SH5 operative (`Shell/Verbs.lean:236-238`), and the
`order` and `names` verbs W3-12 and W3-14 added (`:194-202`).

---

## C-10 — The E2 module DAG after today's growth: one module with two unrelated jobs, and one module outside the gate

**Station:** wire codecs and digest (via the identity assembly), plus the factory itself.
**Strength: WORTH EXPLORING** for the split; the gate gap is a straightforward correction.

**Files.** `formal/entity-store/E2.lean:1-22` (22 imports);
`formal/entity-store/E2/Gates.lean:6-26` (21 imports — **`E2.A4Probe` is absent**);
`E2/Obligations.lean:13-29` (the identity assembly) against `:31-105` (the obligation
ledger); `E2/A4Probe.lean:24-25, 27` (the probe, `namespace E2.A4Probe`);
`E2/Model.lean:34-39` (the topology note recording that `canonicalSpellingB`/`usesBinderB`/
`litNarrowB` are defined here but *owned* by `E2/Admission`).

**Problem — three observations, ranked.**

*(a) `E2/A4Probe.lean` is imported by `E2.lean` (`:21`) but not by `E2/Gates.lean`.* The
opaque/unsafe scan walks `env.constants` and filters on the `E2` prefix
(`E2/Gates.lean:33-47`), which reaches only the constants of modules `Gates.lean` imports.
So `E2.A4Probe`'s constants are outside G1, and the ledger's "Gate constant count: 1707"
(`LEDGER.md:7`) is a count of the scanned set, not of `E2`. This is the same class of gap
F-43(a) found on the shell side, where the executable roots were invisible to every G-S scan
until `lakefile.toml` declared them as a library (`Shell/Gate.lean:55-58`,
`experiments/entity-store-shell/lakefile.toml:15-19`). A probe module is unlikely to carry an
`opaque` constant; the point is that the gate cannot say so.

*(b) `E2/Obligations.lean` holds two unrelated things.* Lines 13-29 are the **identity
assembly** — `versionByte`, `kindSchema`, `kindEntity`, `preimageS`, `preimageE`, `addressS` —
which is the most byte-load-bearing code in the estate and the thing a cutover must
reproduce first. Lines 31-105 are the **stated-obligation ledger** —
`ObligationEncodeSchemaInjective`, `ObligationCanonIdempotent`, `ObligationDirectionB` and
company. The module's own header describes only the second (`:1-6`). Every downstream module
imports it for one or the other. `E2/VersionByte.lean` then proves a theorem *about* the
first while living elsewhere.

*(c) The rest of the DAG is sound, including the modules that look thin.* `E2/Bridge.lean`
(100 lines, three stated obligations after B4's retirement), `E2/Reject.lean` (64 lines, one
theorem), `E2/Correspondence.lean` (55 lines) and `E2/IntraKind.lean` (83 lines) all pass the
deletion test the same way: they are **seat modules against pinned statements** — the
statement lives upstream, the proof lives in its own module, and the separation is the
estate's PROCEDURE, not an accident (`E2/Reject.lean:2-9`, `E2/Wf3.lean:2-5`,
`E2/TypedReachability.lean:2-5`). Merging any of them would concentrate a proof into a
statement module and break the "a statement that resists proof is a STOP-and-report"
discipline. **No shallow module was found.** The one genuine oddity is the topology note at
`E2/Model.lean:34-39`, where three predicates are *defined* in `Model` and *owned* by
`Admission` because the import DAG forces it — already reported to the coordinator by the
seat that created it, and correctly left alone.

**Deletion test.** `E2/Obligations.lean` fails it in a specific way: deleting the module
would *move* the ledger half harmlessly (obligations are inert Props with no callers among
themselves) while *concentrating* nothing — which says the two halves are not one module.
The other modules pass.

**Solution sketch.** Move the gate gap first, since it is a one-line correction to
`E2/Gates.lean`'s import list and it re-founds the ledger's constant count on the whole
namespace. The `Obligations` split is a separate, editorial question: the identity assembly
wants a home whose name says what it is, next to `E2/VersionByte.lean` which already proves
things about it, and the obligation ledger keeps the name. Both are additive under the
estate's additive-vs-arity law — no constructor arity changes and no seat's import name
changes except by one module path — but the second is a rename across the tree and belongs in
the editorial window W3-6 step 5 already reserves, not in a seat.

**Benefits.** *Leverage*: the gate covering the whole namespace is what makes the ledger's
count a claim rather than a statistic. *Locality*: the pre-image assembly stops being findable
only by knowing that "Obligations" also means "identity". *Testability*: unchanged.

**Carries across the gate.** The identity assembly carries `directionA`, `kind_separation`,
`version_byte_separates`, `version_byte_separates_bump` (`LEDGER.md:12-13, 38-39`) and is the
input to `M12_dedup`/`M12E_dedup` (`:17, 28`). The gate itself carries the axiom-cleanliness
of every row in `LEDGER.md:9-40` — which is the estate's headline claim and the one thing a
cutover cannot import.

---

## 11. Where cross-language mechanical guards would attach

The brief asks which seams have a natural byte-level gate today and which need one built.
This is a survey, not a recommendation.

### 11.1 Instruments that exist

| Instrument | Where | What it gates |
|---|---|---|
| `#e2_opaque_scan` + `#print axioms` × 30 | `E2/Gates.lean:29-52, 54-167` | the model's axiom cleanliness (Lean only) |
| `#shell_gates` G-S1…G-S5 | `Shell/Gate.lean:133-203` | opaque/unsafe, IO confinement, the enumerated whitelist, core-name shadowing, clock reads (Lean only) |
| Differential harness, 26 scripts | `Shell/Harness.lean:127-156` | model vs disk observables, in memory, discarded |
| Ledger byte-compare | `experiments/entity-store-ledger`, `mise.toml:27-33` | `LEDGER.md` equals a fresh extraction |
| Generated-tree byte-compare | `experiments/entity-store-generate` (`README.md:31-33`) | the generated Lean tree equals a fresh generation |
| `git diff --exit-code` | `mise.toml:39` | every generated artifact, in one line |
| `#guard` address hex on two CAVP messages | `Shell/Hash.lean:35-41` | the digest and the hex spelling |
| `#guard` render/parse round-trip, 9 carriers | `Shell/Gate.lean:223-231` | the fixture syntax |

**The shape worth noticing:** `mise run gen` + `git diff --exit-code` (`mise.toml:35-43`) is
already a general-purpose byte-level gate for *any* generated artifact. Every guard proposed
below can attach to it without a new instrument, which is why C-2 and C-5 are cheap.

### 11.2 Seams with a natural byte-level gate — the guard is a file away

- **Wire codec (`encSchema`/`encValue`/`encNat`/`encStr`/`encInt`/`encAddress`).** Pure,
  total, `List UInt8`-valued (`E2/Encode.lean:29-143`). A carrier→hex vector file is the
  whole guard. Nothing to build but the extractor.
- **Pre-image assembly (`preimageS`/`preimageE`).** Same shape, one layer up
  (`E2/Obligations.lean:19-26`). Vectors here also pin `canonS`/`canonV`, since the
  pre-image canonicalizes on the way (`:20, 26`).
- **Address spelling (`hexOfAddr`/`addrOfHex`, 64 bytes).** `Shell/Hex.lean:54-64`. Two
  `#guard`s already exist (`Shell/Hash.lean:35-37`); a vector file generalizes them.
- **Name spelling (`hexOfName`/`nameOfHex`, `validName`, the 64-character cap).**
  `Shell/Hex.lean:104-112`, `Shell/Verbs.lean:46-52`. Pure string→string; a vector file
  covering the `25-name-roundtrip-hostile` edges (`trailing.`, `con`, `NUL`, the five stray
  classes) is a direct transcription of an existing fixture.
- **The transcript.** `Shell/Script.lean:172-173`. Committing per-script expected transcripts
  (C-2) makes *every* observable a byte-level gate at once — addresses, rejection clauses,
  violation lines, exit codes, the `order` and `names` verb output.

### 11.3 Seams that need a gate built

- **The runner boundary.** No seam exists yet (C-1); until one does there is no attachment
  point for a third implementation at all. This is the load-bearing one.
- **Out-of-process execution.** Blocked by the enumerated whitelist
  (`Shell/Gate.lean:72-98`) — a ruling, not a build. The alternative attachment point is a
  driver *outside* the shell package, which needs no ruling but moves the acceptance gate out
  of `lake exe harness`.
- **The store engine's clause set.** `admissibleReport` cannot be a gate while it has no
  callers (C-3); the gateable surface today is `checkReport`'s rendered output, which is
  covered by the transcript guard rather than by a clause-level one.
- **`Conforms`.** Undecidable pending M18 (`E2/Model.lean:595-600`, SH6). No gate is
  possible; the obligation record is the standing instrument
  (`Shell/Store.lean:223-228`, `Shell/Boundary.lean:411-419`).
- **The service surface's exit codes.** Outside the differential (C-8). The class-2 legs
  additionally need a hostile filesystem, which is the same whitelist question.
- **The E2 gate's own coverage.** `E2/A4Probe.lean` is outside it (C-10(a)); the guard exists
  and does not reach.
- **Non-file directory entries.** `place-symlink`/`place-fifo` BLOCKED
  (`STORE-SHELL.md:263-270`), so two of the four legs of W3-15's file-type discipline have no
  mechanical guard on either side.

### 11.4 One rule to hold the guards to

`optimization-never-trust-source` (CONTEXT.md) applies to every artifact proposed above: a
committed vector or transcript is an **expectation regenerated from the reference and
compared**, never a recorded verdict. The moment a guard file is trusted instead of
regenerated, it is a manifest that records a verdict — which is the exact failure the rule
names, and which `mise.toml:35-43`'s `gen`-then-`diff` ordering already prevents by
construction.

---

## 12. Register of what this report confirmed and refuted

| # | Brief's friction | Verdict |
|---|---|---|
| 1 | harness runner seam — is a third adapter cleanly addable? | **Confirmed, worse than framed.** Not smeared across three modules — *absent*. And the whitelist forecloses an out-of-process runner entirely (C-1). |
| 2 | `StoreMap` as a linear assoc list; is the representation behind an interface? | **Confirmed.** `abbrev`, so fully transparent; `List` methods used directly in five modules. Plus an unasked finding: the list *order* carries `M10_rank`, and the shell re-orders it (C-4). |
| 3 | `Shell/Verbs.lean` width — is `runVerb` deep or shallow? | **Partly refuted.** `runVerb` is deep and is the estate's best seam. The *module* carries four jobs, two of which the cutover does not need (C-9). |
| 4 | script language — a real cross-language interface, or Lean-coupled? | **Partly refuted.** Not Lean-coupled; a TS runner could parse it. But the grammar's only home is an experiment README, and the transcript format — the actual comparison unit — is specified nowhere (C-7). |
| 5 | wire codec surface — documented/extractable, or Lean-only? | **Confirmed.** Lean-only, across four modules; the ratified corpus names two tag values out of twenty-two (C-5). |
| 6 | golden-vector gap | **Confirmed, and it is the widest gap.** One committed store address in the whole estate; two committed digests; no transcript is ever written down (C-2). |
| 7 | E2 module DAG after growth — any shallow module? | **Refuted for shallowness.** Every thin module is a seat module against a pinned statement and passes the deletion test. Two different findings surfaced: `A4Probe` outside the gate, and `Obligations` carrying two jobs (C-10). |
| 8 | `admissibleReport` vs the shell's per-carrier calls — one surface or two? | **Confirmed at the store level, refuted at the carrier level.** The carrier calls correctly go through Admission's surface. The whole-store report has **zero callers** and the shell decides all six clauses itself (C-3). |

---

## 13. Docket dependencies (named, not advised)

Three candidates cannot be fully closed without a ruling that is the operator's, and they are
named here only so the dependency is visible:

- **C-1** (out-of-process runner) and **C-6/§11.3** (symlink and FIFO fixtures) both wait on
  the **whitelist question** — a process surface for the harness, already on the package's
  own owed list (`experiments/entity-store-shell/README.md:502-503`) and recorded as W3-20's
  BLOCKED item (`STORE-SHELL.md:263-270`).
- **C-4**'s second move (a lookup interface) is explicitly downstream of **W3-21**'s
  measurement, and must not precede it.
- **C-10**'s `Obligations` split belongs to the **editorial window W3-6 step 5** already
  reserves, not to a seat.

No candidate above depends on **R-2**, on the digest seam, or on **M18**.

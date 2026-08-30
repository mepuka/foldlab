# host-api — the host mirror and the API surface, stated as an algebra

Area slug: `host-api`. Operator-ordered algebraic model review,
2026-08-30. Reviewer role: implementer view (state the algebra that
exists), breaker view (attack it), clean-algebra proposal.

**Scope.** `library/effects/src/cas/` at HEAD (`Store.ts`, `Graph.ts`,
`Node.ts`, `Backend.ts`, `Programs.ts` read via `git show HEAD:` — the
working copy is dirty and was not reviewed), the generated surfaces
under `src/cas/generated/`, the export set (`src/index.ts`, `src/Cas.ts`),
and the CLI verbs as API (`bin/cli/commands.ts`,
`bin/cli/tree.ts:27-38`).

**Out of scope, noted as pending.** `Cas/Lang/Worded.lean`,
`Cas/Lang/WordWire.lean`, `bin/cli/history.ts`, `src/cas/WordLog.ts`,
`generated/WordLogSchema.ts` (merge branch `merge/cas-word`), and
`bin/mcp/http.ts`, `bin/cli/daemon.ts`, `docs/lab-core/SERVING.md`
(merge branch `merge/daemon-spine`) — per
`.staging/operational-structure/CORE-ABSTRACTIONS-PLAN.md:40-56`.
Several findings below touch the *word* as an observable; the
`merge/cas-word` branch introduces a second word carrier and a
`WordSig`, so the synthesizer should route finding **X1** past that
branch before ruling.

**Line citations.** `Programs.ts:N` means HEAD's numbering (548 lines).
Every other file is cited at its committed numbering, which equals the
working tree for those files.

**Method note.** Every exhibit below was executed. Exhibits A–G ran
HEAD's `Programs.ts` (extracted with `git show`, import specifiers
rewritten to absolute paths, no other edit) against a real in-memory
`CasStore` under SHA-256; exhibits H–I ran the real CLI
(`bun bin/cas.ts`) against a real file store. Outputs are quoted
verbatim.

**In-flight note, stated once and not relied on.** The dirty working
copy of `Programs.ts` already carries a fix for exhibits A–D (a
`wfRefusal` door replacing `bounded`). It is uncommitted, so HEAD is
what this report grades. It does **not** close H4 (`stepNodes` /
`encodeLine` / `tableNode` stay ungated), and it does not touch X1,
X2, X3, S1–S5, or any CLI finding.

---

## Part (a) — IMPLEMENTER VIEW: the algebra that exists

### A.1 The signature

**Sorts** (all first-order except the effect carrier, so all of
stratum 1 in R14's sense; nothing here is a `Prog`):

| Sort | Carrier | Declared |
|---|---|---|
| `ContentId` | branded `string`, `/^[0-9a-f]{64}$/` | `Node.ts:23-26` |
| `Byte` | `Int ∈ [0,255]` | `Node.ts:15-18` |
| `NodeKind` | `{version: Byte, tag: Byte}` | `Node.ts:30-34` |
| `CasReference` | `{id: ContentId, expectedTag: Byte}` | `Node.ts:37-41` |
| `CasNodeInput` | `{kind, payload: Uint8Array, refs}` | `Node.ts:46-51` |
| `CasError` | 7-member tagged union | `Node.ts:114-121` |
| `Operand` | `literal(ContentId) \| answer(number)` | `Programs.ts:102-104` |
| `OperandRef` | `{expectedTag: number, source: Operand}` | `Programs.ts:114-117` |
| `Line` | `put(version,tag,payload,refs) \| load(source)` | `Programs.ts:120-128` |
| `Program` | `ReadonlyArray<Line>` | `Programs.ts:133` |
| `StoredProgram` | `{address, steps}` | `Programs.ts:340-343` |
| `RunOutcome` | `{word, answers}` | `Programs.ts:465-468` |

Their Lean shadows: `Addr32`, `UInt8`, `Node`, `Refusal`,
`Cas.Lang.PIn` (`Defun.lean:167-170`), `PLine` (`:180-184`), `PProg`
(`:187`), `Word` (`Cas/IR/Word.lean`).

**Operations** (the export set, as `Cas.*`):

```
digest        : Bytes → Eff⟨ContentId, StoreFailure⟩        Store.ts:96-100
load          : ContentId → Eff⟨Node, CasError⟩             Store.ts:64-68
put           : Node → Eff⟨ContentId, CasError⟩             Store.ts:81-85
publish       : ContentId → Eff⟨void, BackendFailure⟩       Backend.ts:86-89
list          : Eff⟨ContentId[], BackendFailure⟩            Backend.ts:90-92
closure       : ContentId → Eff⟨ContentId[], CasError⟩      Graph.ts:104-114
verify        : ContentId → Eff⟨ContentId[], CasError⟩      Graph.ts:204-212
verifyNodeBytes : Address × ContentId × Bytes → Eff⟨Node⟩   Store.ts:135-157

encodeLineBody : Line → Bytes                               Programs.ts:191
encodeLine     : Line → Node                                Programs.ts:204
tableNode      : ContentId[] → Node                         Programs.ts:216
stepNodes      : Program → Node[]                           Programs.ts:227
decodeLineBody : Bytes → Option⟨Line⟩                       Programs.ts:263
decodeLine     : Node → Option⟨Line⟩                        Programs.ts:295
putProgram     : Store × Program → Eff⟨StoredProgram⟩       Programs.ts:357
programAddress : Digest × Program → Eff⟨StoredProgram⟩      Programs.ts:385
loadProgram    : Loader × ContentId → Eff⟨Program⟩          Programs.ts:406
runProgram     : Store × Program → Eff⟨RunOutcome⟩          Programs.ts:492
runProgramAt   : Store × ContentId → Eff⟨RunOutcome⟩        Programs.ts:544
```

**CLI verbs as API** (`bin/cli/tree.ts:27-38`): `init`, `status`,
`doctor`, `put` (two forms), `publish`, `ls`, `show`, `run`, `verify`,
`serve`.

### A.2 The abstraction function

Stated where it is stated, and it is only stated in prose.

- For the store: `α(bytes at id) = the node the canonical codec decodes`,
  with `α` total only on canonical bytes (`Store.ts:132-157`). No
  named `α`, no homomorphism square written anywhere in TS.
- For programs: `α(Program) = Cas.Lang.PProg`. **This function is never
  written down and its domain is never stated.** It is *partial* — the
  TS `Line` type is strictly wider than `PLine` (see H1) — and the
  partiality is the single largest hole in the area.
- For a run: `α(RunOutcome) = ?`. The docstring says the `word` field
  is "the addresses admitted, in admission order" (`Programs.ts:459-461`)
  and VOCABULARY.md:95-101 ratifies "word is the model's name for a
  run's history … word equality is the conformance gate". Exhibits F
  and G show the field is **not** that function. See X1.

### A.3 The law table

Status vocabulary: **PROVED** (Lean theorem, cited), **GATED** (a byte,
word, or battery gate carries it — cited), **ASSERTED** (stated in a
docstring, carried by nothing), **FOLKLORE** (relied on, written
nowhere), **FALSIFIED** (an executed exhibit below defeats it as
stated).

#### Store law

| # | Law | Status | Evidence |
|---|---|---|---|
| S-1 | `load` re-verifies: canonical decode, byte-identical re-encode, known kind, recomputed address; never renormalizes | GATED | `Store.ts:135-157`; battery `test/CasStore.test.ts`, `test/Cli.test.ts:370` (corrupted object refused at the witnessing node) |
| S-2 | `put` admits children-first: every ref resident at its declared tag, else `DanglingReference` / `WrongKindReference` | GATED | `internal/admission.ts:69-98`, `Store.ts:241-273`; Lean shadow `referenceHandler`'s put clause `Cas/Lang/Handler.lean:80-88` over `Word.wfFrom` (`Cas/IR/Word.lean:141`) |
| S-3 | equal canonical bytes → equal address; a second put is inert | GATED | `Cli.test.ts:194,334`; Lean Level 0 of the CAS-003 lattice, `Cas/Core/Address.lean:15-19` |
| S-4 | a hash collision at distinct bytes is a typed refusal, not a silent overwrite | GATED | `admission.ts:95-96`, `Store.ts:254-257`, `Backend.ts:141-146` |
| S-5 | "check-then-insert is **sound** without a lock because the byte plane only grows" | **ASSERTED** | `Store.ts:11`, repeated `Store.ts:238-240`. No judgment named, no theorem, no concurrency battery. C5 flag — see S3 below |
| S-6 | scheme-0 SHA-256 through WebCrypto is "**proved** against the scheme-0 known-answer vectors by the conformance gate" | ASSERTED-as-PROVED | `Store.ts:392-394`. A known-answer gate is a gate, not a proof. C5 flag |

#### Graph law

| # | Law | Status | Evidence |
|---|---|---|---|
| G-1 | `closure` emits children-first, deduplicated, root last | ASSERTED + GATED | `Graph.ts:101-103`; `test/Graph.test.ts` |
| G-2 | `verify` re-verifies "under the store law's read checks — recomputed address, canonical decode, known kind" | **claim-scope gap** | `Graph.ts:200-204`. The code *also* enforces edge typing (`Graph.ts:171-176`), which `load` never does. The enumerated list under-reports the refusal set — see S4 |
| G-3 | `verify` succeeds "**exactly when** the backend faithfully serves the whole graph" | ASSERTED | `Graph.ts:203-204`. A biconditional with no theorem, no gate on the ⇐ direction, and no definition of "faithfully" |
| G-4 | a Lean shadow for reachability audit | **absent** | `Word.wf` (`Cas/IR/Word.lean:141-150`) is the model-side closure predicate over a *word*; nothing relates it to `Graph.verify` over a *store*. The estate's flagship verb has a battery and no law |

#### Program codec

| # | Law | Status | Evidence |
|---|---|---|---|
| P-1 | `putProgram(t).address` = the cont address `Cas.Lang.encodeProg` computes for `t`, character for character | **GATED** (the strongest gate in the area) | `Programs.ts:34-41`; `test/Programs.test.ts:104-133` against `test/generated/VectorProgramAddresses.json`, addresses computed by this host's own SHA-256; the fixture is byte-identity-gated in `check:cas`. Lean: `encodeProg` `Defun.lean:847`, `tableNode` `:841` |
| P-2 | `loadProgram(putProgram(t)) = t` | GATED on 8 programs; **FALSIFIED in general** | `Programs.test.ts:135-153` (seven registered), `:175-209` (one literal/load table). Lean: `decodeProg_encodeProg` `Defun.lean:998-1002` under `hwf : ∀ l ∈ p, l.WF` and `hsep`. Host mirrors `hwf` incompletely — **exhibit A** |
| P-3 | a line body must be consumed EXACTLY; a trailing byte is a refusal | GATED | `Programs.ts:267,287`; `Programs.test.ts:242-262`. Lean: `readLine_exact` `Defun.lean:764` |
| P-4 | the tag is the gate: a non-step node decodes to nothing | GATED | `Programs.ts:295-296`; `Programs.test.ts:230-240`. Lean: `decodeLine` `Defun.lean:582`, `decodeLine_exact` `:826` |
| P-5 | `programAddress` (no store) = `putProgram` (store) | GATED | `Programs.test.ts:211-224` |
| P-6 | a cont node whose declared line count disagrees with its edges is refused | ASSERTED, **host-stricter than the model** | `Programs.ts:437-455`. Lean's `decodeProg` (`Defun.lean:939-946`) has no such clause — see X4 |
| P-7 | the step/cont tag numbers are the registry's | GATED (byte) | `Programs.ts:92,96` reads `generated/grammar/kindTags.ts`, emitted by `lake exe emitgrammar`, byte-identity-gated in `check:cas` |

#### Run law

| # | Law | Status | Evidence |
|---|---|---|---|
| R-1 | `RunOutcome.word` = "the addresses admitted, in admission order" | **FALSIFIED** | `Programs.ts:459-461`. `word.push` is unconditional (`:524`) while `referenceHandler` does not extend the word on a duplicate (`Handler.lean:86`) — **exhibits F, G, I** |
| R-2 | a load extends the answer history and NOT the word | GATED | `Programs.ts:462-464,525-533`; `Programs.test.ts:204-208` |
| R-3 | naming an answer that has not been given refuses | GATED | `Programs.ts:473-478`; `Programs.test.ts:264-278`. Lean: `runP_no_dangling` `Defun.lean:2101` |
| R-4 | `runProgramAt(s, putProgram(s,p).address) = runProgram(s,p)` | **FOLKLORE, FALSIFIED** | Asserted by construction at `Programs.ts:544-548`; the only check is a self-comparison over the registered programs (`Programs.test.ts:163-165`) — **exhibit D** |
| R-5 | cross-host word equality for `runProgram` | GATED for **one** program | `test/BrainStem.test.ts` equality 2 (`cas_run_ref` on `fileReadme` vs `library/cas/vectors/file-readme.json`). The seven-program word gate (`test/VectorPrograms.test.ts`) runs the *separately emitted* `test/generated/VectorPrograms.ts`, which never touches `Programs.ts`. See H5 |
| R-6 | the empty table | **FOLKLORE** | Lean refuses it (`Defun.lean:273-276`, `:293`); the host succeeds with an empty word — **exhibit E**. Nothing states either way on the host |
| R-7 | the designated result is the last answer | ASSERTED, **not exported** | `Programs.ts:462-464` says so; `RunOutcome` has no result field and no `Status`. Every caller re-derives it or ignores it (none derives it: `commands.ts:653-668`, `handlers.ts:230-244,248-270` report the word only) |

#### Roots / publication

| # | Law | Status | Evidence |
|---|---|---|---|
| T-1 | `publish` grows a set; idempotent; `list` order unspecified | ASSERTED | `Backend.ts:82-92`; memory impl `Backend.ts:148-152` (a `Set`), file impl `FileBackend.ts:211-218` (presence of an empty file) |
| T-2 | publication is fail-closed: an address publishes only if the store holds it | **FOLKLORE at the seam** | Lean has it at the *signature*: `stepRooted`'s publish clause `Cas/Lang/Roots.lean:77-80`, read back by `publish_mem` `:111-119`. The host seam has no such guard; it is re-implemented at two call sites (`commands.ts:696-700`, `bin/mcp/handlers.ts` `cas_publish_root`) — see H6 |
| T-3 | Lean's roots are a list with `roots ++ [a]`; the host's are a set | **cross-carrier inconsistency** | `Roots.lean:78` vs `Backend.ts:149-151` — see X3 |

#### CLI as API

| # | Law | Status | Evidence |
|---|---|---|---|
| C-1 | every verb that answers a question has two registers; `--json` is one JSON object through the canonical printer; `serve` is the only exception | **FALSIFIED** | Stated `commands.ts:113-122` and ratified `IMPLEMENTATION-PLAN.md:1553-1557`. `cas put --program --json` prints prose — **exhibit H** |
| C-2 | `verify` reports a verdict per root, never stopping at the first refusal; `verified` is a boolean on every JSON row with the clause beside it | GATED | `commands.ts:1054-1117`; `Cli.test.ts:276,370,545` |
| C-3 | `publish` loads before publishing, so a root that will not load is never published | GATED | `commands.ts:694-700`; `Cli.test.ts:250` |
| C-4 | `cas run` — any law at all | **untested** | `commands.ts:647-686`. No case in `test/Cli.test.ts` invokes `run` or `put --program`; the verbs' only exercise is through the library and the MCP host |
| C-5 | help carries every everyday-register word VOCABULARY.md declares | GATED | `Cli.test.ts:751-766` |
| C-6 | `status` / `doctor` never re-derive a counter an emitter wrote | ASSERTED | `commands.ts:806-813`; no gate distinguishes "read the ledger" from "recomputed it" |

---

## Part (b) — BREAKER VIEW

### The holes (underspecification: a wrong implementation passes)

#### H1 — the abstraction function's domain is unstated, and the encoder *truncates* outside it instead of refusing

**CONFIRMED (exhibit A).** `Cas.Lang.PLine` carries `version tag : UInt8`
and `PIn.ans (i : Nat)` (`Defun.lean:180-184,167-170`); the host `Line`
carries `version: number`, `tag: number`, `expectedTag: number`,
`index: number` (`Programs.ts:114-128`). `PLine.WF` (`Defun.lean:191-196`)
needs no byte clause because the Lean *type* supplies it. The host's
only door is `bounded` (`Programs.ts:312-331`), which checks three
upper bounds and nothing else. The encoder then narrows by
`Uint8Array.of` (`Programs.ts:195,185`) and `>>>` (`:137-143`), both of
which **truncate silently**.

```
LAW        putProgram answers encodeProg's address for the table it was given
FALSIFIER  exhibit p ≠ q with programAddress(H,p) = programAddress(H,q)
BATTERY    none exists
```

**Exhibit A** (executed, HEAD `Programs.ts`, SHA-256):

```
p = [{ _tag:"put", version:  0, tag:1, payload:[0x01], refs:[] }]
q = [{ _tag:"put", version:256, tag:1, payload:[0x01], refs:[] }]

A1 encodeLineBody(p[0]) = 000001000000010100000000
A1 encodeLineBody(q[0]) = 000001000000010100000000          ← identical
A2 programAddress(p) = b81a029eea17a387250227d5a0acbb15b47bcdaee4b313571b066512dfe23f35
A2 programAddress(q) = b81a029eea17a387250227d5a0acbb15b47bcdaee4b313571b066512dfe23f35
A3 putProgram(q)     = Success, same address
A4 loadProgram(putProgram(q)) = [{ "_tag":"put","version":0,"tag":1,... }]
```

`q` is stored at `p`'s address and reads back as `p`. **P-2 is
falsified** and `decodeProg_encodeProg`'s `hwf` premise is where the
break lives: the host admits tables outside `hwf`'s domain, so the
theorem says nothing about them, and the code does the *wrong* thing
rather than nothing.

Same shape at `expectedTag` (**exhibit B**: `expectedTag: 257` encodes
as byte `01`) and at the answer index (**exhibit C**):

```
C1 encodeLineBody({_tag:"load", source: answer(-1)}) = 0101ffffffff
C2 decodeLineBody(that) = Some(load answer(4294967295))
C3 putProgram([...,answer(-1)]) = Success
```

`answer(-1)` is stored and reads back as `answer(4294967295)`.

#### H2 — the two run doors disagree off the gated set

**CONFIRMED (exhibit D).** `runProgram` resolves an answer by
`answers[operand.index]` (`Programs.ts:503`), which is `undefined` for a
fractional index; the *encoder* maps `answer(1.5)` to `answer(1)`.

```
LAW        runProgramAt(s, putProgram(s,p).address) = runProgram(s,p)
FALSIFIER  exhibit p where one succeeds and the other refuses
BATTERY    Programs.test.ts:163-165, but only over the registered programs
```

**Exhibit D** (executed):

```
p = [ put v0 t1 [0x03], put v0 t1 [0x04], load answer(1.5) ]
D1 encodeLineBody(p[2]) = 010100000001                       ← answer(1)
D2 runProgram(store, p)                     = Failure
D3 runProgramAt(store, putProgram(p).address) = Success, word length 2, 3 answers
```

The same table refuses through one door and succeeds through the other.
This is BREAKER.md's "caller leans on the body" shape: the client that
puts and then runs by address gets a different program than the one it
handed over.

#### H3 — the empty table has no stated meaning on the host, and it has one in Lean

**CONFIRMED (exhibit E).** `runPFrom` on `[]` with an empty history is
`.refused (.failed "defun: empty program")` (`Defun.lean:273-276`).

```
E1 runProgram(store, [])   = Success { word: [], answers: [] }
E2 putProgram(store, [])   = Success, cont address 9ca0e761…67b02, steps []
E3 runProgramAt(empty prog) = Success { word: [], answers: [] }
```

An "empty program" is a first-class, publishable, runnable store
citizen on this host and a refusal in the model. Nothing in
`Programs.ts` mentions the case.

#### H4 — the representation is exported, so the one gate is bypassable, and the estate's own flagship test bypasses it

`stepNodes` (`Programs.ts:227`), `encodeLine` (`:204`),
`encodeLineBody` (`:191`) and `tableNode` (`:216`) are public and none
consults `bounded`. `test/BrainStem.test.ts:295-296` uses exactly this
path (`Programs.stepNodes(table)` then `Programs.tableNode(addresses)`,
put over MCP `cas_put`), so the estate's showcase transcript for R7
routes around the program plane's only admission door.

This is API.md's export-closure and representation-leak shape (§9.2,
§9.5) at once: the byte layout is part of the public surface, so it can
never be replaced, and the invariant `putProgram` establishes is not
established by the closure a client actually has.

#### H5 — `runProgram` has no cross-host word gate over the registered set

`test/VectorPrograms.test.ts:21-41` is the seven-program word gate, and
it runs `test/generated/VectorPrograms.ts` — Lean-emitted Effect code
that calls `store.put` directly. `Programs.ts`'s interpreter is not on
that path. The only cross-host word comparison that reaches
`runProgram` is `BrainStem.test.ts` equality 2, for the single program
`fileReadme`. So the module that claims to mirror `Cas.Lang.runP` is
word-gated on 1 of 7 registered programs.

Worse, the test named for the job asserts something else. `Programs.test.ts:155`
is titled *"running a stored program reproduces its vector's word"*;
its assertions are `byAddress.word === direct.word` (**this host against
itself**, `:164-165`) and `word.length === instructions.length`
(`:166-167`). No vector word is read in that test. The second assertion
enshrines a law that is *false in the model* — see X1.

#### H6 — publication's fail-closed law is not a seam law

`RootStoreShape.publish` (`Backend.ts:86-89`) takes any `ContentId`. The
guard lives at `commands.ts:696-700` and in the MCP handler, in two
hand-written copies. `Cas.RootStore` is exported (`src/Cas.ts`), so a
library client publishes a dangling root in one call, and `cas ls` then
reports it with its refusal (`commands.ts:370-375`) — the exact state the
CLI comment says publication prevents. Lean has the guard at the
signature (`Roots.lean:77-80`, `publish_mem:111`).

#### H7 — the freshness distinction exists internally and is erased at the door

`AdmissionVerdict` distinguishes `Admit` from `AlreadyResident`
(`internal/admission.ts:32-33`); `put` collapses both to `id`
(`Store.ts:258-259,267-272`). `CasStoreShape.put : Node → Eff⟨ContentId⟩`
therefore **cannot** answer the model's word, because the model's word
grows only on `.fresh` (`Handler.lean:84-86`). No client of the export
set can compute the observable the conformance gate is stated over.
This is the root cause of X1, and it is an export-set defect, not a
`Programs.ts` bug.

### The cross-carrier inconsistencies

#### X1 — `RunOutcome.word` is not the model's word (the headline)

**CONFIRMED (exhibits F, G, I).** Lean:
`.ok (.duplicate a) => .ok (a, w)` — a duplicate put answers the
address and leaves the word alone (`Handler.lean:84-86`). Host:
`answered = yield* store.put(...)` then `word.push(answered)`,
unconditionally (`Programs.ts:519-524`).

**Exhibit F** — a table with two identical puts:

```
F1 runProgram word = [ 374460d9…6c67, 374460d9…6c67 ]     (length 2)
   Lean runP over the empty word: length 1
```

**Exhibit G** — the same table run twice against one store:

```
G1 run 1 word = [ fa829a5b…adf3, 5b4c4f60…18a1 ]
G2 run 2 word = [ fa829a5b…adf3, 5b4c4f60…18a1 ]   ← every node already resident
G3 equal? true
```

**Exhibit I** — the same, through the real CLI, on a real file store:

```
$ cas run --json f91319…020b --store <store>
{"lines":1,"program":"f91319…020b","word":[{"address":"19d41f11…f5ca"}]}
$ cas run --json f91319…020b --store <store>          # nothing left to admit
{"lines":1,"program":"f91319…020b","word":[{"address":"19d41f11…f5ca"}]}
```

The second invocation admitted nothing and reported one binding as
"history … admitted" (`commands.ts:666`, help text `:685`).

Why it matters, precisely:

1. R5 makes word equality *the* cross-host conformance gate
   (`EFFECTS-BACKEND.md:81-95`). VOCABULARY.md:95-101 ratifies that the
   `--json` `word` field carries the model's name for exactly that
   reason. The field is a different function of the run.
2. `Programs.ts:62-67` states the scope backwards: "two stores that hold
   different content can honestly answer different words for one
   program". This host does **not** do that — it answers the same list
   regardless of store state (exhibit G). The divergence runs the other
   way from the one the comment warns about, so the warning gives false
   comfort.
3. The gate is green only because the registered programs have distinct
   lines and each vector run starts empty. Duplicate-line tables and
   re-runs — both legal and both reachable from the CLI — leave the
   gated region silently.
4. `Programs.test.ts:166-167` asserts `word.length === instructions.length`,
   which is the *host's* law, not the model's. A future word gate
   written against that assertion would be gated on the wrong equation.

#### X2 — the host's run is line-indexed; agreement with the model's is coincidental at the boundary

Both sides index answers absolutely and push one entry per line
(`Defun.lean:199-201,271-292` vs `Programs.ts:509-534`), which is
correct. But the host's `answers` is a *dense per-run array* while the
model's `env` is threaded through `runPFrom`; combined with X1, the
pair `(word, answers)` on the host has no single Lean shadow. The
honest statement of what `runProgram` computes today is:

```
answers[i] = the address the store answered for line i
word       = [ answers[i] | line i is a put ]        (not "admitted")
```

which is a *different, weaker* observable than `runP`'s word, and no
document states it.

#### X3 — the roots plane disagrees on the carrier

`Roots.lean:78` appends: `roots ++ [a]`, so `listRoots` after two
publishes of `a` answers `[a, a]`. The host's memory backend is a `Set`
(`Backend.ts:149-151`) and the file backend is file presence
(`FileBackend.ts:211-218`), both idempotent. `Backend.ts:86` documents
"Idempotent". Neither side cites the other; the abstract value of the
roots plane is a list in one carrier and a set in the other.

#### X4 — `loadProgram` refuses cont nodes `decodeProg` accepts

`Programs.ts:437-455` adds two clauses `Defun.lean:939-946` does not: the
payload must be exactly four bytes, and the declared count must equal
the edge count. Witness: a cont node with payload `nat32(0)` and two
step edges — Lean recovers a two-line table, the host refuses. The
clauses are defensible (the header argues them at `:403-405`) but they
make `loadProgram` a strictly stronger partial function than the
operation it says it mirrors (`:397-399`, "`Cas.Lang.decodeProg` against
a real store instead of against a word"). Either the model gains the
clauses or the docstring loses the identification.

#### X5 — `runProgramAt` is exported and has no production caller

Both production callers compose `loadProgram` then `runProgram` by hand
(`commands.ts:651-652`; `bin/mcp/handlers.ts:248-270`), so the door
described as "the whole brain stem in one arrow" (`Programs.ts:538-543`)
is exercised only by `Programs.test.ts` against itself. Three spellings
of one act, one of them dead.

### The claim-scope gaps (the "technically" class)

#### S1 — the recovery premise is declared inherited, and the estate declares the opposite

`Programs.ts:69-77`: *"Under SHA-256 the premise is the collision
resistance this host already assumes everywhere else, so it is
inherited rather than restated."*

The CAS-003 lattice states the estate's actual position
(`Cas/Core/Address.lean:12-26`):

> **Level 2 — empty, and forced to be.** No theorem assumes collision
> resistance.

`hsep` is a named, Level-1-shaped premise stated at the table's lines
(`Defun.lean:998-1001`, argued at `:907-937`). The docstring converts an
*owed* premise into an *inherited* one and attributes the assumption to
"everywhere else" in the estate, which the Lean side explicitly refuses
to do. Under C5 this is a soundness-flavoured claim with no named
judgment. The honest form: `loadProgram ∘ putProgram = id` holds on this
host under an unproved separation assumption on SHA-256, and nothing in
the estate carries that assumption.

#### S2 — the "word is a function of the table and the digest" claim

`Programs.ts:65-67`: *"every one of them is a table of puts alone, so its
word is a function of the table and the digest, and nothing else."*
True of the *host's* `word` field, for any table (exhibit G), and
therefore not the property being claimed. It is **false** of the
model's word, which is a function of the table, the digest, **and the
starting word**. The sentence reads as a scoping caveat and is in fact
the statement of X1's defect.

#### S3 — "sound" about host concurrency

`Store.ts:11` and `:238-240` use "sound" about check-then-insert. The
argument (a grow-only byte plane) is plausible and is not a judgment.
There is no theorem, no named trust statement, and no concurrency
battery in `test/`. R14 stratum 4 is explicit that host seams supply
nothing equational; the word must go or name its judgment.

#### S4 — `verify`'s enumerated checks under-report what it enforces

`Graph.ts:200-202` lists "recomputed address, canonical decode, known
kind"; `Graph.ts:171-176` also refuses `WrongKindReference` on every
edge — a check `load` never performs (`Store.ts:184-197`). A caller
reading the docstring cannot predict the refusal set. `commands.ts:1133`
inherits the omission ("re-hash and re-decode everything reachable").

#### S5 — `verify`'s biconditional

`Graph.ts:203-204`: "Succeeds … **exactly when** the backend faithfully
serves the whole graph." Neither direction is proved or gated, and
"faithfully" is undefined. Given S4, the ⇐ direction is at best
"faithfully serves the graph *and* every edge's target sits at its
declared tag" — which is a statement about the *content*, not about the
host's fidelity.

#### S6 — "proved … by the conformance gate"

`Store.ts:392-394`. A known-answer vector gate is `γ`-class evidence
(CONTRACT.md conformance), not `π`. Stamp the gate, drop "proved".

### The CLI-surface defects

#### H8 — `cas put --program --json` prints prose

**CONFIRMED (exhibit H).** `putProgramDocument` takes `(file: string)`
only (`commands.ts:525`); the dispatcher discards `json` on that branch
(`commands.ts:626-628`). Executed against the real CLI:

```
$ cas put --program --json <lift.json> --store <store>
address    f91319211c75adc4b1c8b12e3ac2d1140e570db2adab01f23ea04d28baac020b
kind       program  (scheme 0)
program    valueSingle
lines      1 step

$ cas put --json <plain.txt> --store <store>            # the contrast
{"address":"8fd564a4…9115","bytes":6,"kind":{"name":"value","registered":true,"tag":1,"version":0}}
```

An agent that branches on `--json` gets four prose lines. This is the
same class the docket already tracks for the help verb
(`GRILLING-DOCKET-2026-08-29.md:225`), on a second verb.

#### H9 — `cas put --program` can spell only a sub-fragment, and says otherwise

`decodeLiftDocument` (`commands.ts:577-600`) maps every instruction to a
`put` line with an `answer` operand. `load` lines and `literal`
operands — both first-class in `Programs.Program` and both round-tripped
by `Programs.test.ts:175-209` — have no spelling. The help text claims
the whole table: "the file is a program document; **its table** is put"
(`commands.ts:618-620`, `:629`).

#### H10 — `cas put --program` performs no dataflow check

Neither `putProgram` nor the CLI checks that answer indices name earlier
lines. Lean has the predicate (`dataflowClosed_eq`, `Defun.lean:1225`)
and the run-side theorem (`runP_no_dangling`, `:2101`). A program whose
line 0 names answer 5 is publishable and permanently unrunnable, and
`cas publish` will happily make it a root because the cont node loads
fine.

#### H11 — `cas run` and `cas put --program` have no CLI battery

`test/Cli.test.ts` exercises `put` (bytes), `publish`, `ls`, `show`,
`status`, `init`, `doctor`, `verify`, `serve`. The two verbs that carry
R7 — the reason the program plane exists — are absent.

---

## Part (c) — THE CLEAN ALGEBRA

Decision 2 binds: **no new sorts, no new carriers.** Everything below is
consolidation. Three items need a ruling and are marked as questions,
not proposals.

### C.1 The signature, as it should read

Unchanged sorts. Two operations change *type*, both within existing
carriers:

```
put : Node → Eff⟨Admitted, CasError⟩          where Admitted = { id: ContentId, fresh: boolean }
```

`fresh` is the `AdmissionVerdict` distinction that already exists at
`internal/admission.ts:32-33` and is thrown away at `Store.ts:258-272`.
No new sort — `Admitted` is a two-field record over `ContentId` and
`boolean`. **This is the one change that makes the model's word
computable through the export set**, and without it X1 cannot be closed
in the host at all. *Ruling question 1: is widening `CasStoreShape.put`'s
answer a new abstraction under decision 2, or the recovery of a
distinction the internal judge already makes?*

```
runProgram : Store × Program → Eff⟨RunOutcome, CasError⟩
             RunOutcome = { word, answers, result }
```

`result` is `answers.at(-1)`, already named as the designated result at
`Programs.ts:462-464` and already required by `runP`'s `.done a`
(`Defun.lean:274`). No new sort.

### C.2 The law list

**Store**

| Law | Verdict |
|---|---|
| S-1 load re-verification | **keep** |
| S-2 children-first admission with typed edges | **keep** |
| S-3 dedup at equal canonical bytes | **keep**, and **strengthen**: `put` answers `fresh:false` exactly on the second and later puts |
| S-4 collision is a typed refusal | **keep** |
| S-5 lock-free check-then-insert | **strengthen**: restate as a trust statement naming the grow-only byte-plane assumption, or delete the word "sound" (C5) |
| S-6 WebCrypto SHA-256 | **strengthen**: "gated by the scheme-0 known-answer vectors", not "proved" |
| **new** — `α(put(n)) = the address `Cas.put` answers, and `fresh` = the verdict's `.fresh`/`.duplicate` | **state-new**, gate by the existing vector suites |

**Graph**

| Law | Verdict |
|---|---|
| G-1 children-first, dedup, root last | **keep** |
| G-2 verify's checks | **strengthen**: the docstring enumerates the edge-typing clause it enforces |
| G-3 "exactly when the backend faithfully serves" | **strengthen**: replace with the two directions separately — (⇒) success implies every reachable node re-hashes, re-encodes canonically, sits at a known kind, and sits at its parent's declared tag; (⇐) *owed* |
| **new** — `Graph.verify` succeeds on `w` iff `Word.wf w` for the reachable sub-word | **prove-owed** (Lean shadow for G-4; `Word.wf` at `Cas/IR/Word.lean:150` is the existing carrier — no new sort) |

**Program codec**

| Law | Verdict |
|---|---|
| P-1 cont address = `encodeProg`'s | **keep** — the reference standard for the whole area |
| P-2 `loadProgram ∘ putProgram = id` | **strengthen**: state it over `WF(Program)`, and make `WF` a real door (below) |
| P-3 exact consumption | **keep** |
| P-4 tag gate | **keep** |
| P-5 `programAddress = putProgram` | **keep** |
| P-6 cont self-agreement | **keep on the host**, and either lift the two clauses into `decodeProg` or drop the "mirror of `decodeProg`" identification (X4) |
| P-7 tags from the byte-gated registry | **keep** |
| **new** — `WF : Program → Option⟨refusal⟩`, the complete host mirror of `∀ l ∈ p, PLine.WF l` **plus** the clauses Lean's types supply for free: `version`, `tag`, `expectedTag` are integers in `[0,256)`; every `answer` index is an integer in `[0, 2³²)` | **state-new**. It is a predicate over an existing sort, not a new sort |
| **new** — every door that turns a `Program` into bytes passes `WF` first: `putProgram`, `programAddress`, `runProgram`, **and `stepNodes` / `encodeLine` / `encodeLineBody` / `tableNode`** | **state-new** (closes H1 and H4 together) |
| **new** — `encodeLineBody` is injective on `WF` programs | **prove-owed** on the host as a property battery; Lean carries it via `decodeLine_encodeLine` (`Defun.lean:635`) |

**Run**

| Law | Verdict |
|---|---|
| R-1 word = admitted addresses | **strengthen to the model's**: `word` extends only when `put` answers `fresh:true`. Requires C.1's `Admitted`. Until then the field must be **renamed in prose and in `--json`** to something that is not the model's word — it currently claims the conformance gate's observable and is not it |
| R-2 a load does not extend the word | **keep** |
| R-3 dangling index refuses | **keep** |
| R-4 `runProgramAt = runProgram ∘ loadProgram` | **strengthen**: state it over `WF` programs, gate it as a property, and delete either `runProgramAt` or the two hand-composed call sites (X5) |
| R-5 cross-host word equality for `runProgram` | **strengthen**: run the seven registered tables through `Programs.ts`'s own `runProgram` against `library/cas/vectors/*.json`, not only through the emitted module. One line of the existing fixture plumbing; it is the gate R5 names |
| R-6 the empty table | **state-new**: refuse it, matching `Defun.lean:273-276`, or rule that the host's total-on-empty behaviour is the intended divergence and record it. Silence is the defect |
| R-7 designated result | **state-new**: `RunOutcome.result` |
| **new** — dataflow closure is checked at the put door | **state-new**, mirroring `dataflowClosed_eq` (`Defun.lean:1225`). *Ruling question 2: does a program with dangling dataflow enter the store as content (R7: programs are content, and content is not judged for runnability) or is closure an admission clause of the program plane?* The estate has the predicate; only the placement is unruled |

**Roots**

| Law | Verdict |
|---|---|
| T-1 idempotent grow-only set | **keep** |
| T-2 fail-closed publication | **strengthen**: move the guard into one door the export set exposes, so `Cas.RootStore` cannot publish a dangling root and the two hand copies collapse to one. Lean already has it at the signature (`Roots.lean:77-80`) |
| T-3 list vs set | *Ruling question 3: which carrier is the roots plane's abstract value — Lean's `roots ++ [a]` list or the host's set? They are not both right, and `listRoots`'s answer type differs between them* |

**CLI**

| Law | Verdict |
|---|---|
| C-1 two registers on every answering verb | **keep** the law, **fix** the verb: `put --program` takes `json` (closes H8) |
| C-2 per-root verdict | **keep** — with `verify`, the second reference standard for the area |
| C-3 publish loads first | **keep**, and let it become T-2's single door rather than a call-site check |
| C-4/H11 `run`, `put --program` untested | **state-new**: a CLI battery for both, including the `--json` register |
| C-6 doctor re-derives nothing | **strengthen** or drop the claim; nothing distinguishes reading from recomputing |
| **new** — `put --program`'s document register states its fragment | **state-new** (H9): either the lift document gains `load` and `literal` spellings, or the help text says "the served sub-fragment: puts over earlier answers" |

### C.3 What "the reference standard" means here

Measured against P-1 and C-2, the rest of the surface falls into three
tiers, and the tiering is the actionable summary:

- **Tier 1 — a decidable cross-host equality, gated, with the fixture
  derived on both sides.** P-1 only. It states an equation
  (`putProgram(t).address = encodeProg(t)`'s cont address), the
  observable is 64 hex characters, the fixture is byte-identity gated,
  and neither side is allowed to compute the other's answer.
- **Tier 2 — a decidable host predicate with a battery and a named
  refusal set, but no model shadow.** `verify`/C-2, S-1, S-2, P-3, P-4,
  R-2, R-3. These are honest; what they lack is a Lean law, so they are
  `γ` without `π`.
- **Tier 3 — a prose claim with no equation and no gate.** R-1, R-4,
  R-6, R-7, T-2, T-3, G-3, S-5, S-6, C-6, and every CLI verb's
  contract. This is where every "well, technically" in the area lives,
  and X1 is the one that costs the most because the estate's ratified
  conformance gate is stated over exactly the observable that sits
  here.

---

## Ruling questions for the synthesizer

1. **Does `put` answer freshness?** Without it the host cannot compute
   the model's word through the export set (H7), and X1 is unclosable
   in the host. `AdmissionVerdict` already draws the distinction
   (`admission.ts:32-33`); the question is whether surfacing it is a
   new abstraction under decision 2.
2. **Is dataflow closure an admission clause of the program plane, or is
   an unrunnable program legitimate content under R7?** (H10.)
3. **Is the roots plane's abstract value a list or a set?** (X3, T-3.)
4. **Do `decodeProg`'s clauses grow to match `loadProgram`'s, or does
   `loadProgram` stop claiming to mirror it?** (X4.)
5. **Does the `merge/cas-word` branch's `WordSig`/`since` change the
   answer to X1?** The branch was not reviewed (out of scope) and it
   introduces a second word carrier; X1's fix should not be ruled
   before that branch is read.

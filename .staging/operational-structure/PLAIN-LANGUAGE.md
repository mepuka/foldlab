# PLAIN-LANGUAGE — the semantics→prose capability

Draft for operator grilling. Coordinator lands at `.staging/operational-structure/PLAIN-LANGUAGE.md`. Repo at `771ba655`. Read-only pass; nothing built.

---

## 0. Blockers, first

**B1 — The register cannot describe the estate it is supposed to describe.** `REGISTER.md` was drafted against `library/effects/src` (the Effect/TS *hand-written* surface). Grep of the landed schema universe against it: `oneOf` 0 hits, `anyOf` 0, `Enums` 0, `Tuple` 0, `StoreRef` 0, `cas_struct` 0, `cas_union` 0, `Exchange` 0. But `Cas.Schema.Ast` (`/Users/pooks/Dev/foldlab/library/cas/Cas/Schema/Ast.lean:63-158`) has twelve constructors including `union (members) (mode)`, `enum`, `tuple (first) (more) (rest)`, `ref (tag)`, `decl`. The gap is not cosmetic: **R17 `schema union [A, B]` has no slot for the mode, and the mode is IDENTITY** (`SCHEMA-MATERIALIZATION.md` rulings 6, 13, 18; `materialized/estate/union-pin.ts:22-23` ships one `anyOf` and one `oneOf` union in the same struct, at different addresses). A register row that cannot distinguish two addresses is not a register row. Same class: `tuple-pair` vs `tuple-pair-swapped` are "a DIFFERENT code at a different address" (`conformance/schema-verdicts.json`), and R-nothing spells tuple order.

**B2 — The theorem literature's source drops the literature.** `tools/Surface.lean` records `documented := (← findDocString? env n).isSome` — a *boolean*. The docstring TEXT never reaches `surface/cas-surface.json`. The ledger is a literature INDEX with the literature deleted. Any theorem-prose projection is blocked on that one line. (Compounded by open ruling 24: the walk imports `Cas` only, so `Cas.Backend.*` is invisible.)

**B3 — The register has live consumers but no ratification.** "register R13" is cited by *ten* landed sites including two byte-gated artifacts: `tools/Verdicts.lean:221`, `Cas/Backend/Admission.lean:230,302`, `Cas.lean:68`, `Cas/Schema/SelfCodec.lean:705,951,1075,1095,1311`, `Cas/Schema/Ast.lean:143`, `Cas/Schema/Schema.lean:57`, and `library/effects/src/cas/generated/SchemaAdmission.ts:107`. An unratified document with thirteen self-declared defects is already load-bearing in generated TypeScript. Either ratify the rows those sites cite, or the citations are citing a draft.

**B4 — There is no adoption edge, so the meaning edge has nowhere to live.** The salvaged design's whole point (`git show attic/language-surface-folding-media:docs/design/2026-08-14-the-language-surface.md` §1.3) is that `Proposed` (evidence, federates free) and `Interpreted` (the adoption, a decision, compare-and-swaps) are two events. `Cas/Schema/Exchange.lean` records prompt+answer as ONE node and states its answer "is EVIDENCE and carries no trust". Correct as far as it goes — and it means the estate has the evidence half and *none* of the decision half. Minting it is gated by ruling 25 (replay-vocabulary reactivation "is a ruling to make BEFORE an Utterance slice, not during one").

**B5 — Two of the three projections are already shipping as hand-written prose under a byte gate.** `tools/EmitPrograms.lean:31-52` carries eight hand-typed `doc` strings; `conformance/schema-verdicts.json` carries 68 hand-typed `note` strings (zero empty); `Cas/Backend/Mcp.lean:300-316` carries five hand-typed tool `description`s. These are byte-gated *transcriptions*, not projections — exactly the "hallucinated documentation" class the Gate discipline exists to kill, one indirection up. Every one is a candidate to be *replaced by* its computed verbalization, with the gate turning red at the first disagreement. **This is the design's largest free lunch and its sharpest test.**

---

## A. The deterministic projection: Semantics → prose

### The shape, in the estate's existing terms

There is one machine, not three. The house already owns a typed Markdown emitter (`Cas/Values/Markdown.lean`, 98 lines: `Inline`, `Block`, arity-checked `Table n`, escape-by-default, no raw-text constructor) and the manifest lane already owns the prose type over it:

```
abbrev Prose := List Inline          -- Cas/Grammar/Manifest.lean:60
def Prose.plain (p : Prose) : String -- the JSON flattening
```

`Prose` is the register's carrier. A verbalizer is `X → Prose` for a first-order `X`, rendered to Markdown by `Cas.Values.Markdown.render` and flattened to plain text for JSON — **the same value, two surfaces, the R11 shape the grammar and lift manifests already prove out** (`Cas/Grammar/Manifest.lean:816` `Manifest.toMarkdown`, `:852` `registry`; `Cas/Lift/Manifest.lean:177,218`).

### (a) Schema codes — EMITTER. Ratify first, then generate.

`Ast` is `DecidableEq`, first-order, `WF`-gated. `Ast → Prose` is structural recursion — D3 by construction, and D1/D2 are decidable claims about it (one spelling per constructor; injectivity of the spelling on `WF` codes). Verdict: **this is the register's true home.** The register's R10–R24 are the *Effect-side spellings*; what the estate needs is the same table stated over `Ast`, from which the Effect spelling is one projection and the prose is another.

Concrete rows the landed universe forces, none of which exist:

| landed | register today | owed |
|---|---|---|
| `Ast.union ms .oneOf` / `.anyOf` | R17, no mode slot | mode is identity — two spellings, mandatory |
| `Ast.tuple first more rest` | — | order is identity; `rest` is `TupleWithRest` |
| `Ast.enum members` | — | alias members admitted (`enum-pin`: `Warn`/`Warning` both `1`) |
| `Ast.ref tag` / `StoreRef t` | — | the typed edge; lowers to `{"$ref":0}` |
| `Ast.decl id payload` | R? (Declaration, 1 mention) | Date/URL/Option rows, ruling 7 |
| `cas_struct` / `cas_union` | — | the Lean authoring notation (`Cas/Schema/Notation.lean`) |

Gate wiring: a new `lake exe emitregister` on the `Gate.mainAt` skeleton, two fixtures — `library/cas/register/schema-register.json` (front ends) and `library/cas/REGISTER.md` (humans) — added to `check:cas` (`mise.toml:116-131`, joining the eleven existing `--check` legs). **The acceptance is not the emitter, it is the collision:** point the verdict corpus's `note` field at the computed verbalization and run `lake exe verdicts --check`. 68 hand-written notes vs 68 computed ones; every disagreement is either a register defect or a prose defect, named at a fixture.

### (b) Program tables — EMITTER, and the cheapest one.

`Envelope` already exists and is already the right object (`Cas/Lang/Defun.lean:1180-1195`):

```
structure Envelope where
  reads : List Addr32          -- literal addresses the table consults
  puts : List PutShape         -- version, tag, payload, refKinds — in program order
  dataflow : List (Nat × Nat)  -- (i,j): line i consumes line j's answer
```

"Stratum-1 data — decidable, hashable, addressable". `Envelope → Prose` needs *nothing new*: put shapes verbalize through (a)'s tag spellings (the grammar manifest already names every sort in prose — `REGISTRY.md`'s `tree`, `manifest`, `git`, `schema` rows), dataflow verbalizes as "line 3 reads line 1's answer", `Envelope.putCount` and `Envelope.dataflowClosed` are the two summary sentences. Plane P of the register (R61–R72) is the *code* half of the same object; the prose half is the missing sibling.

Gate wiring: **fold it into `lake exe emitprograms`, which already has the slot.** `treeProgram (doc : List String) name tr` (`Cas/Backend/EmitProg.lean:78`) takes the doc as a parameter; today `EmitPrograms.lean:31-52` hands it a literal. Hand it `(envelope tr).toProse.plain` instead and `VectorPrograms.ts`'s eight docstrings become derived. Zero new fixtures, zero new gate legs, one existing byte gate suddenly checking a claim it was previously transcribing.

### (c) Theorems — NOT an emitter today. Blocked on B2, and then only an ARRANGEMENT.

Be honest about what is derivable. From `name + signature` alone, a deterministic paragraph would have to *invent* the theorem's point — that is generation, not projection, and it is exactly what the Gate discipline exists to refuse. What IS deterministic: **selection, ordering, grouping, and the frame around an authored docstring.** The estate's named-obligation convention already puts the meaning in the docstring where it lives (`Cas/Schema/Basis.lean`'s BLOAT-LEDGER states generation/independence/named-redundancy per family, in prose, at the theorem's home).

So (c) is: `surface ledger (with docstring text) + register-verbalized signature → one paragraph per theorem`, where the register supplies the *signature sentence* (deterministic) and the docstring supplies the *point* (authored). Undocumented theorems get a signature sentence and a visible hole — 257 of 624 today.

Verdict on A: **(a) and (b) are emitters. (c) is an emitter after one Surface.lean change, and is a selection projection even then.**

---

## B. The inverse direction: prose → semantics

**The staging is not negotiable and the estate already ruled it.** R13 (`EFFECTS-BACKEND.md:224`): the model is a FAST MATERIALIZER under "empty trust contribution, the gates carry the trust"; a model emission is admitted "exactly like any other artifact: byte gate, typecheck, parse-back through the admitted extractor pair, and (for programs) the word-equality run gate". So:

- **Now:** deterministic verbalization (an emitter, §A). This produces the corpus.
- **Later:** learned parse — model proposes a code/program from prose, the *existing* gates verify. No new trust surface, because the verifier is `ingest`/`admitDocument`/the word gate, all landed.

### The corpus the landed fixtures already provide

| pairs | source | grade |
|---|---|---|
| 68 (code, verbal) | `library/cas/conformance/schema-verdicts.json` — every `case` has a `note`, zero empty; 39 admitted / 29 refused | byte-gated, verdicts computed by running `ingest` |
| 95 (code, value, verdict) | same file — 36 accept / 59 refuse | byte-gated, computed by running `decode` |
| 7 (restriction, prose) | same file, `restrictions` — the corpus's own stated blind spots | byte-gated |
| 8 (program, verbal) | `tools/EmitPrograms.lean:31-52` docs ↔ `VectorPrograms.ts` ↔ the Lean word | byte-gated + run-gated cross-host |
| 10 (code, TS text, address) | `library/effects/test/generated/materialized/estate/*.ts` + `addresses.json` | byte-gated, both registers, differential-tested |
| ~14 (sort, prose) | `REGISTRY.md` rows — each with a `Tree` witness | byte-gated, witness-guarded |
| 19 (element/rule, meaning) | `library/effects/src/cas/generated/lift/manifest.md` | byte-gated |
| 5 (tool signature, description) | `Cas/Backend/Mcp.lean:300-316` | byte-gated |
| 796 (signature, docstring) | `surface/cas-surface.json` — 796 of 1571 documented | gated on the boolean only (B2) |

Roughly **120 pairs at fixture grade** and **~800 at prose grade**. That is not a training set. It is exactly the right size for a *verifier* corpus and a few-shot prompt — which is what R13 actually asks for. The register's job in the inverse direction is to make the ~800 grow to 1571 and to make all of them derived rather than typed.

**The honest additional claim:** the emitters are a corpus *factory*, not a fixed corpus. `emitprograms` lowers any registered grammar term; `emitregister` would verbalize any `WF` `Ast`. R13's "unlimited (denotation, rendering) pairs with byte-exact ground truth" is literally true here — with prose as a third column.

---

## C. The feedback loop as store content

### What exists

- `Cas.Schema.Exchange` — `{answer : String, prompt : String, subject : ExchangeSubject}`, `exchangeKindTag = 0x58` (a *working* tag, ruling 9). `cas_union ExchangeSubject where | exchange (StoreRef exchangeKindTag) | schema (StoreRef schemaKindTag)` — the exchange arm is what makes a conversation a DAG walk. Pinned payload + typed edge, `#guard`ed against the TS suite.
- `Cas.Schema.Annotation` — `{key : String, subject : StoreRef schemaKindTag, value : String}`. The `foldlab/...` sidecar. Subject is a bare ref, **not a union.**

### Is a Description node the missing kind? No — and yes.

**No new node kind is needed for the description itself.** A plain-language description of a concept is an `Annotation` with key `foldlab/register/prose` and value = the prose. That is what S2 (the annotation surface carries the DAG) was ratified for, and it is why `Annotation.value` is documented as "a content address in hex when the value is itself store content".

**What IS missing is the subject arms.** Both kinds can only point at *schema* nodes. A description of a **program**, a **theorem**, a **sort**, or a **node** has nowhere to attach. Exchange's own docstring names the growth path: "Adding an arm is how the kind grows to a new plane." So:

1. `ExchangeSubject` grows arms — `program`, `declaration`, `node`. Cheap, additive, and it is the *stated* growth mechanism.
2. `Annotation.subject` must become a union too, or annotation is permanently schema-only. **This is a real asymmetry between two sibling kinds and it should be grilled.** Note it moves the annotation code's address, so it is a versioning event, not a patch.

**What is missing and is NOT cheap: the meaning edge.** The salvaged design's law — `utterance ← interpretation → value`, both feet evidence, the span a decision, single-homed — has no carrier. Exchange records the pair; nothing records the *adoption*. Three specific consequences:

- Two agents can hold two Exchange nodes proposing different meanings for one prompt, and the store cannot say which one the estate *adopted*. Both are true facts; that is the design working. The gap is that adoption is unspellable.
- "Provenance is committed, not attached" (salvaged §1.4): the interpreter's identity (model, params, prompt digest) belongs in the work digest. Exchange carries no interpreter field, so re-interpretation by a different model is not structurally a different unit of work. Today that is *fine* because there is no adoption to overwrite. It stops being fine the moment there is.
- The re-encoding loop — description → context → LLM direction → new description — is a `subject`-chain walk today (exchange→exchange), which is `Decision trace` under another name.

**Ruling 25 gates exactly here.** It says the growth path for role-tagged multi-turn transcripts "lands on the dormant effect-replay vocabulary — 'Solicited delegation' IS a recorded invoke/outcome pair, 'Decision trace' IS an ordered record of turns", and reactivating it "is a ruling to make BEFORE an Utterance slice, not during one". The adoption edge is *precisely* an Utterance-adjacent slice: it needs a principal, a role distinction (who adopted), and an ordered record. **So: descriptions-as-annotations can land now; the adoption edge cannot, and should not be smuggled in as an extra Exchange field.**

Ruling 9 also bites: `exchangeKindTag` is spelled *inside the code* (the self-referential arm), so it is part of the fixture's address. Widening the subject union moves that address. Do it once, with the tag minting, not twice.

---

## D. The theorem literature

### Both — but the emitter first, and it is the same shape as `emitgrammar`.

The precedent is exact. `lake exe emitgrammar` renders **one described value** (`Cas.Grammar.manifestV0`) to **two surfaces**: `library/effects/src/cas/generated/grammar/manifest.json` (front ends) and `library/cas/REGISTRY.md` (humans), both byte-gated, neither hand-maintained (ruling 28, CLOSED). The literature is the fourth instance of that pattern (after grammar, lift, MCP):

- `library/cas/surface/cas-literature.json` — per module: what it proves, the theorem rows with register-verbalized signatures and their docstrings, the axiom census, placement rationale.
- `library/cas/LITERATURE.md` — the same value through `Cas.Values.Markdown.render`.

The workbench view then reads the JSON. It is not an alternative; it is the second consumer, exactly as the front ends consume `manifest.json`. Building the view *without* the emitter would put the literature in a place the byte gate cannot see — a defect in the estate's own terms.

**Placement rationale is the interesting field and it is half-authored already.** The surface ledger's `touches` (architecture areas the signature mentions) and `carriers` (the 15 ratified core carriers — `Prog`, `Sig`, `Handler`, `interpret`, `Ast`, `El`, `Described`, `Tree`, `Ty`, `Word`, `Node`, …) are *computed* placement. `Basis.lean`'s BLOAT-LEDGER is *authored* placement, per family, in the house's three-part shape. The literature projection is: computed placement (free) + authored rationale (the docstring) + register-verbalized statement.

### What S5 demands of theorem naming

S5 (`SCHEMA-MATERIALIZATION.md:23-33`): five seats at once — USING, PROGRAMMING, READING, PROMPTING, RUNNING. "A name or surface that works in one seat and jars in another is not done."

The theorem corpus has **two naming registers, and the boundary is accidental**. Census over `surface/cas-surface.json` (624 theorems):

- **450 of 624 are ≤2 segments** — mathlib convention: `readChunk_append`, `readFrame_exact`, `readN_encode`, `bytesOfHexS_hexS`, `hexVal_hexChar`, `nat32_mod`. These serve PROGRAMMING and RUNNING (`simp` sets, rewrite discovery) and **fail PROMPTING and USING**: they are lookup keys, not sentences. `hexVal_hexChar` does not name a claim; it names two functions.
- **39 are sentence-shaped** via `_of_`/`_is_`/`_not_`/`_iff_`: `eq_of_forall_interpret`, `tag_eq_of_encodeNode_eq`, `addr_eq_of_encode_eq`. These pass all five.
- The estate's *best* names are outside both conventions and are its actual literature: `canonValue_widens_door`, `deNumNorm_is_independent`, `renderPlain_not_injective`, `canonValue_redundant_on_image`, `wf_is_independent`, `runPFrom_puts_sound`, `runPFrom_absent_sound`. Each is a sentence a human can be taught from. **These are what "the names ARE the literature" means, and there are perhaps thirty of them.**
- **257 of 624 theorems carry no docstring at all.** Under the literature thesis those are unteachable by construction: no name-sentence, no prose.

**The demand, stated for grilling:** S5 does not require renaming 450 lemmas — mathlib convention *is* correct for the PROGRAMMING seat and renaming would break rewrite ergonomics. It requires declaring the split: an **API theorem** (a claim the estate makes about itself — Basis results, soundness, injectivity, independence, initiality) is named as a sentence and carries a docstring; a **lemma** (machinery serving a proof) keeps mathlib convention and is *excluded from the literature projection*. The literature emitter should carry that classification as a field, and the gate should refuse an API theorem with no docstring. Today the two are indistinguishable, which is why 257 holes are invisible.

---

## The ratification path for REGISTER.md

**Do not ratify it as written.** Three reasons, in order:

1. **It describes the wrong artifact.** It is a register of hand-written Effect/TS *source*; the estate's plain-language capability needs a register of `Ast`/`PProg`/`Envelope` — the first-order carriers everything else projects from. The Effect spelling is one *output* of that register (it is what `Cas/Backend/EmitAst.lean` + `Ts.lean` already emit — `materialized/estate/*.ts`). **Regenerate §3.2 (R10–R24) from `Ast`, not from `Schema.*`.** The 30 rules covering `Effect.gen`/`Layer`/`Context`/`catchTags` (R25–R60) describe hand-written host code that R7 says is *hosts, not programs* — they are a different, lower-priority document.

2. **Its own adversarial pass found the defects that matter.** C1 (two `dot` spellings for a stage), C2 (lowercase concrete types collide with the abstract letter-run — `option(string)`, `effect(never)`), C3 (R72 truncates a payload in the one field the doc twice declares un-elidable, and gives one source two verbals), C6 (R50 is a second lambda spelling), C7 (R59 is not a legal stage), C8 (`:` carries three meanings), C9 (`checked` has two argument spellings and `max` names two things), C10/C11 (binder loss and index ambiguity in plane P), C13 (no rule for the flagship composite `name : type = expr`). **C2, C3, C9, C11 and C13 are D1/D2/D4 violations in the plane the estate needs; the rest are in the host-code plane.** Grill those five first.

3. **Open question 7 is the ratification principle.** "Should the register cover only attested constructs?" — **yes, and the estate has a mechanism for exactly that: the witness.** `Cas.Grammar.manifestV0` does not transcribe layouts; "every form carries a WITNESS — a term whose elaboration IS the shape the row states" and the `#guard`s read the shape off the witness. A register row should carry a witness `Ast` term the same way. Then R25/R39/R44's "zero hits" problem cannot recur: an unattested rule has no witness and does not elaborate.

### What to grill (five)

1. **The mode/order identity hole** (B1) — R17 and the missing tuple/enum rows. A spelling that cannot distinguish two addresses is not a spelling.
2. **C2, the lowercase collision** — the fused-letter law is unsound as stated; TypeScript's primitives are lowercase.
3. **Plane P vs the emitters** (open question 4 + C3 + C11) — the estate has *three* program spellings already (ruling 23: "triage found three spellings of the program document, not two"). Plane P would be a fourth. Route it through `PProg`/`Envelope` or drop it.
4. **`refuse`** (open question 3) — a minted English verb with no source token. The estate's law is that the register is scaffolding and names are data (§1.3); `refuse` breaks its own rule. Note the store language already uses `Refusal` as a carrier name (`Cas.Lang.Refusal`), which is either a virtue or a collision.
5. **Where it lives** (open question 11) — answered below: `library/cas/REGISTER.md`, generated.

### What to regenerate

`REGISTER.md` becomes the Markdown projection of a described `Register` value, exactly as `REGISTRY.md` became the projection of `manifestV0` (ruling 26/28). Rows are data with witnesses; the prose is `Prose = List Inline`; the byte gate is `lake exe emitregister --check` in `check:cas`. The prose *about* the register (§1 principles, §4 collisions, §6 open questions) stays hand-written — it is a ruling record, not a projection, and `REGISTRY.md` keeps hand-authored notes the same way.

---

## Emitter inventory

| # | emitter | fixtures | source value | gate wiring | status |
|---|---|---|---|---|---|
| E1 | `lake exe emitregister` | `library/cas/register/schema-register.json`, `library/cas/REGISTER.md` | `Cas.Register.registerV0` over `Ast` | new leg in `check:cas`, `Gate.mainAt` | NEW — needs B1 grilled |
| E2 | `lake exe verdicts` (existing) | `conformance/schema-verdicts.json` | `note` field ← E1's verbalizer | already wired (`mise.toml:123`) | CHANGE — 68 hand notes become derived |
| E3 | `lake exe emitprograms` (existing) | `library/effects/test/generated/VectorPrograms.ts` | `doc` ← `Envelope.toProse` | already wired | CHANGE — 8 hand docs become derived |
| E4 | `lake exe surface` (existing) | `surface/cas-surface.json` | add `doc : Option String`, `role : api \| lemma`; fix ruling 24's import set | already wired (`mise.toml:131`) | CHANGE — unblocks B2 |
| E5 | `lake exe emitliterature` | `surface/cas-literature.json`, `library/cas/LITERATURE.md` | ledger + E1 signature verbalizer + docstrings | new leg in `check:cas` | NEW — blocked on E4 |
| E6 | `lake exe mcpspec` (existing) | `mcp/cas-tools.json` | `description` ← E1/E2 verbalizer | already wired | LATER — 5 hand descriptions |

All six ride `tools/Gate.lean` unchanged: `Fixture{path, content, label}`, verdicts `wrote`/`ok`/`missing`/`differs`, `--check` visits every fixture and fails once with a byte offset. All six render through `Cas.Values.Markdown` — no ad-hoc string concatenation, escape-by-default, arity-checked tables.

**The inventory's shape is the argument.** Four of six are *existing* gates whose hand-written prose becomes derived. Only two new fixtures. The estate's answer to hallucinated documentation is not "gate the prose" — the prose is already gated. It is "make the gated prose a projection of the thing it describes", and the existing gates then check it for free.

---

## The smallest first slice

**E3 alone. One file, one existing gate, no new fixtures, no rulings needed.**

`Envelope.toProse : Envelope → Prose` in `Cas/Lang/Defun.lean` (or a sibling), then `tools/EmitPrograms.lean:31-52` hands `treeProgram` the computed doc instead of the literal. `lake exe emitprograms --check` goes red on eight docstrings; each red line is either a prose defect or a verbalizer defect, named at a byte offset.

Why this one:
- `Envelope` is landed, proved, and stratum-1 (`runPFrom_puts_sound`, `runPFrom_absent_sound`, `dataflowClosed`/`runP_no_dangling`). Nothing to design.
- `treeProgram` already takes `doc` as a parameter (`EmitProg.lean:78`) — the seam exists.
- Eight programs is small enough to read the whole diff and large enough to falsify the thesis. If a computed sentence cannot say what "A two-leaf blob: chunks, leaves, parent, manifest" says, the design is wrong and it costs one day to find out.
- It makes the claim testable at the *cross-host run gate*: the same programs whose words are asserted equal in both hosts now carry derived descriptions.

Slice two: E1 restricted to the leaf constructors (`null`/`bool`/`int`/`str`/`lit`/`arr`/`struct`), collided against the corresponding subset of E2's 68 notes. Slice three: E4's docstring text. Then E5.

---

## Ruling asks

1. **Ratify the register's PLANE.** The register's subject is `Ast`/`PProg`/`Envelope` (first-order estate carriers), not hand-written Effect source. R25–R60 are a separate, later document about hosts.
2. **Rule the mode/order rows** (B1) — union mode, tuple order, tuple rest, enum aliases. These are identity, so their spellings are forced, and until they exist the register cannot describe a landed address.
3. **Rule "attested constructs only, by witness"** (open question 7) — a register row carries an `Ast` witness or does not elaborate. This closes the R25/R39/R44 class permanently rather than instance by instance.
4. **Rule the API/lemma split for theorem names** (S5, §D) — sentence-named + docstring-required for API theorems; mathlib convention retained for lemmas; the literature emitter carries the classification and the gate refuses an undocumented API theorem. Today: 257 of 624 undocumented, 450 of 624 lookup-key-named, no way to tell which matter.
5. **Rule the Annotation subject asymmetry** (§C) — `Annotation.subject` is `StoreRef schemaKindTag`; `ExchangeSubject` is a union. Descriptions of programs and theorems need arms. This moves addresses, so bundle it with ruling 9's tag minting.
6. **Rule 25 explicitly, before anything touches adoption** — the meaning edge (`Proposed` vs `Interpreted`, the single-homed span) needs the dormant replay vocabulary reactivated first. Until then: descriptions land as annotations; adoption stays unspellable, and that is the correct state.
7. **Close ruling 24 in the same breath as E4** — the surface walk imports `Cas` only; `Cas.Backend.*` is invisible to the literature and to retrieval-before-generation.
8. **Rule where the register lives** (open question 11) — `library/cas/REGISTER.md`, generated by `emitregister`, byte-gated in `check:cas`, alongside `REGISTRY.md`. Ten landed sites already cite "register R13" including generated TypeScript; the citation target should be a gated artifact.

---

### The thesis, restated against what exists

The estate already ships prose as a byte-gated projection — `REGISTRY.md` and `lift/manifest.md` are generated Markdown from described values, and they read well. What it does not yet do is derive the prose that *describes its own semantics*: 68 schema notes, 8 program docs, 5 tool descriptions and 796 docstrings are hand-typed beside the machine-checked artifacts they describe. The register is the missing function, `Prose`/`Markdown` is the missing carrier already built, and `Gate` is the missing verifier already built. The theorem names are the literature — and a census says two thirds of them are currently lookup keys, and 257 have no prose at all. That is the gap the design closes, and the first slice is eight docstrings.

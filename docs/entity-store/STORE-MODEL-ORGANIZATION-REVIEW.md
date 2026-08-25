# Entity store model — organization review

Status: design review, not semantic authority — 2026-08-25. This document records
observations and recommendations. It does not change `STORE-MODEL.md`, mint domain
vocabulary, amend a ruling, or promote a claim.

## Purpose

The entity store model already describes substantial behavior, but the document makes a
reader assemble the store's purpose and interface from mathematical definitions, theorem
names, dated rulings, and implementation updates. The recommended change is to organize the
specification around two deep modules:

1. the **semantic store module**, which says what a legal store is and what its operations
   mean; and
2. the **executable store module**, which accepts commands, rejects invalid requests, and
   uses a storage adapter.

This keeps the existing distinction between [STORE-MODEL.md](STORE-MODEL.md) and
[STORE-SHELL.md](STORE-SHELL.md). It makes each document present one interface and hide the
machinery below it.

## Inputs and standing

This review used:

- the current [store model](STORE-MODEL.md), [store shell](STORE-SHELL.md), Lean model under
  `formal/entity-store/E2/`, and executable shell under
  `experiments/entity-store-shell/Shell/` as repository evidence;
- the user-supplied aviation resource-management example as an organizational example; and
- the user-invoked `codebase-design` skill for the architectural terms **module**,
  **interface**, **seam**, **adapter**, **depth**, **leverage**, and **locality**.

Provenance for the two user-supplied review inputs is pending. Neither input is semantic
authority for the entity store. All recommendations below remain proposals until they go
through Foldlab's ruling process.

## Main finding

The current model is rich in internal precision but does not yet read as the interface of a
deep module. It mixes four jobs:

1. specifying current behavior;
2. recording the formal theorem inventory;
3. preserving the history of design rulings and amendments; and
4. reporting implementation progress.

Those jobs change at different rates and serve different readers. Keeping them in one file
makes the stable contract look volatile and makes the current behavior harder to find.

The executable shell already contains a promising organizational center:
`Shell.runVerb` takes a store view and a command, then returns an outcome and the writes it
has authorized. The in-process model and the directory-backed store both use that decision
logic. This is a real seam because two adapters cross it. The specification should make this
shape visible without making callers learn the parsing, canonicalization, hashing, reference
checking, or file layout behind it.

## What the aviation example contributes

The aviation example is effective because it develops the specification in the order a
reader needs it:

1. It explains the real problem before introducing notation.
2. It selects only the information relevant to that problem.
3. It places each constraint beside the data it constrains.
4. It distinguishes valid inputs from valid results.
5. It assembles the complete operation only after the parts are understood.
6. It ends with alternative formulations and boundary cases that expose weak requirements.

The entity store specification can use the same order. Its counterpart to a valid flight
allocation is not an optimal answer but a store state that can only be reached through legal
insertions. Its counterpart to an invalid allocation is an object whose address, references,
schema, value, or canonical bytes do not meet the store rules.

The aviation document also keeps prose and formal definitions together. Foldlab should keep
that property. A separately maintained plain-language copy of the entity store contract would
risk drifting from the formal specification and would conflict with the Charter's requirement
that a human rendering eventually be derived. The better approach is to make the canonical
model document readable in its own right and keep the formal details immediately traceable.

## Observed organization of the current store

### Semantic model

The current semantic model contains the following behavior:

- schemas and entities are turned into canonical pre-image bytes and then addressed by a
  digest;
- an entity's schema address is part of the entity's identity;
- a legal store grows by insertion and does not mutate existing objects;
- inserted references must already resolve;
- stored entities must refer to a stored schema and conform to it;
- retrieval checks that stored bytes still match their address;
- names are mutable pointers kept outside object identity; and
- theorems describe deduplication, retrieval, reference closure, typing, and other laws.

These facts are present, but a new reader meets digest parameters and identity machinery
before learning the operational problem the store solves.

### Executable store

The executable shell has a clearer deep-module shape:

```text
Caller
  |
  | command
  v
Executable store interface
  |
  | pure decision: outcome plus authorized writes
  v
Storage seam
  |-------------------------------|
  v                               v
In-process adapter          Directory-backed adapter
```

The decision logic is concentrated in `Shell/Verbs.lean`. Admission and full-store checks
are concentrated in `Shell/Boundary.lean`. `Shell/Model.lean` and `Shell/Store.lean` supply
the two adapters. The differential harness sends the same scripts through both and compares
their observable results.

This arrangement produces locality: a decision changes once in the pure decision logic, and
both adapters inherit it. It also produces leverage: callers can exercise canonicalization,
admission, reference checks, verification-on-open, retrieval, and naming through one command
interface.

### The formal and executable interfaces are different

The model and shell should not be collapsed into one interface.

- The semantic store module speaks only about legal states and legal transitions. Its main
  clients are proofs and implementations.
- The executable store module accepts hostile or malformed input and returns an observable
  rejection. Its clients are command-line, network, and test adapters.

The semantic module explains what proper functioning means. The executable module explains
how a caller encounters that behavior. The shell may have more operational detail without
forcing that detail into the mathematical model.

## Organizational problems to correct

### 1. The problem statement is missing

`STORE-MODEL.md` begins with parameters. It does not first explain the failure that the store
prevents: objects that the declared relation treats as the same receiving different identities,
entities becoming
detached from their schemas, references becoming dangling, corrupted bytes being trusted, or
mutable names changing immutable identity.

Recommendation: begin with the operational problem and the desired result. A reader should be
able to explain the store in ordinary language before encountering `H`, `Digest`, or a partial
map.

### 2. The interface is scattered

The operation table in section 4 is the nearest thing to a semantic interface, but it appears
after the identity scheme and state construction. Preconditions, failure cases, and observable
results are spread across sections 3, 5, 7, and the shell specification.

Recommendation: introduce the semantic interface early. State what a client may ask the model
to do, what it receives, and which facts it may rely on afterward. Keep byte framing, decoding,
canonicalization algorithms, and proof lemmas behind that interface.

### 3. Partial operations transfer knowledge to the caller

The current `put` operations are described as defined when `legalInsert` holds. That is a good
mathematical construction, but it is not by itself a complete caller interface. A caller still
needs to know how legality is established and what happens when it is not.

Recommendation: say explicitly that legality is internal to the semantic construction. In the
executable store, the corresponding command is total: it either returns the stored address or
a named rejection. Callers should not reproduce admission logic.

### 4. Current behavior and development history are interleaved

Section 7 contains final rulings, amendment narratives, falsification reports, scheduling
notes, and implementation outcomes. Section 9 mixes current scaffold coverage with a running
delivery log. These records are valuable, but they obscure the normative reading.

Recommendation: keep the model document in present tense. It should state the rules that apply
now. Move theorem progress and implementation coverage to a linked ledger. Keep the dated
argument and amendment history in the project's ruling record. Move information; do not copy
it into multiple maintained documents.

### 5. The theorem inventory is not yet a reader trace

The theorem numbers are useful for formal work, but a reader must already understand the
model before names such as M8, M12, and M17 become meaningful.

Recommendation: organize required behavior by reader-facing promises first, then point each
promise to its theorem or pending obligation. For example:

| Reader-facing promise | Formal trace |
| --- | --- |
| Stored bytes match their address | WF1 / M8 |
| Stored references resolve | WF2 / M9 |
| Equivalent content is stored once | L-dedup / M12 |
| Retrieval returns the canonical content that was inserted | L-faithful / M15 |
| Every stored entity remains tied to a stored schema | M17 |

This retains precision while letting the prose carry the meaning.

### 6. Error ownership is unclear across documents

The model specifies legal insertion. The shell specifies ordered rejection reasons such as
malformed bytes, the wrong kind, non-canonical bytes, missing references, or an unresolved
schema. The split is reasonable, but `STORE-MODEL.md` does not tell the reader where invalid
requests are specified.

Recommendation: state the ownership split in both documents. The model owns legality; the
shell owns how invalid requests are observed. Do not duplicate the rejection order in the
model.

### 7. Names need an explicit module placement

Names have different behavior from stored objects: objects are immutable and addressed by
content, while names are mutable pointers. The current model correctly keeps names outside
object identity, but the document does not explain whether naming is part of the store's
external interface or a neighboring module composed by the shell.

Recommendation: make this a ruling question. If names remain in the store interface, explain
the leverage they add and why their different mutability belongs there. If naming varies or
grows independently, give it its own module and let the executable store compose it. Do not
introduce a seam merely for neatness; require at least two justified adapters or independently
changing behavior.

### 8. The digest parameter should not become a speculative runtime seam

The abstract digest function is useful in the formal model, and the shell currently supplies
one concrete SHA3-512 implementation. That does not yet justify a general runtime interface
with interchangeable adapters.

Recommendation: keep the digest abstract inside the model and fixed in the current shell.
Introduce a runtime seam only if a second concrete adapter is actually required.

## Recommended shape of `STORE-MODEL.md`

The following order follows the aviation example while preserving Foldlab's claim discipline.

### 1. The problem

Explain why a content-addressed entity store is needed and which failures it prevents.

### 2. Proper functioning in one scenario

Walk through one schema and one entity:

1. The schema is admitted and receives an address.
2. The entity names that schema and is checked against it.
3. Canonical bytes determine the entity's address.
4. Retrieval checks the bytes before decoding them.
5. Re-inserting content treated as the same by the declared relation returns the same address
   without changing the store.
6. A name may be moved to another address without changing either stored object.
7. Reopening a physical store verifies it before ordinary commands run.

This scenario gives every later definition a visible purpose.

### 3. Information the model needs

Introduce addresses, schema content, entity content, references, and names in ordinary
language. State what is intentionally absent.

### 4. The semantic store interface

Present the small set of operations and the facts a client must know. Distinguish the
semantic operation from the shell command when failure behavior differs.

### 5. What makes a store legal

Explain reachability as a construction: start empty and admit one legal object at a time.
Place each insertion condition beside that construction.

### 6. Required behavior

Group the laws by their meaning:

- identity and deduplication;
- append-only growth;
- checked retrieval;
- reference closure and acyclicity;
- schema and entity typing; and
- names remaining outside identity.

Each statement should link to a theorem, a pending obligation, or an explicit non-claim.

### 7. Invalid cases

Give examples of malformed bytes, non-canonical content, missing references, unresolved
schemas, non-conforming entities, and corrupted storage. Point to `STORE-SHELL.md` for the
observable rejection order.

### 8. Boundary cases and counterexamples

Use the aviation example's exercise style to test the requirements:

- What does an empty store permit?
- Can the first entity be inserted before any schema?
- What changes when the same value is stored under two schemas?
- What happens when two schema descriptions differ only in field order?
- Can a name point to a missing address?
- Which rules prevent cycles between stored objects?
- Which behavior depends on digest injectivity, and which does not?

These questions should either have a ruled answer or be labeled pending.

### 9. Exclusions and open decisions

Keep current exclusions and unresolved decisions together. Do not mix them into the statement
of current behavior.

### Appendix: formal trace

Keep minimal notation and links to the theorem ledger. The full proof and implementation
status should live outside the normative flow.

## Recommended document responsibilities

| Document | One job |
| --- | --- |
| `STORE-MODEL.md` | State the semantic store's purpose, interface, valid construction, and required behavior. |
| `STORE-SHELL.md` | State the executable store's interface, rejection behavior, storage rules, and admitted effects. |
| Proposed model ledger | Track theorem statements, proof status, claim gates, and implementation correspondence. |
| Existing ruling record | Preserve dated decisions, alternatives, falsifications, and amendments. |
| This review | Explain the proposed organizational change; it remains non-authoritative. |

The proposed ledger needs a ruled name and home before creation. The split should be performed
as a move, not as duplication, so one fact has one maintained home.

## Testing consequences

The command interface should remain the executable test surface. Current scripts already test
the same observable command sequences through the in-process and directory-backed adapters.
That is the right test for the storage seam.

The harness comparison does not independently validate the shared decision logic, because both
adapters call the same `runVerb`. That is an architectural strength, not a defect: the logic is
defined once. It means the test plan should distinguish:

1. semantic laws proved or checked against the pure model;
2. command examples and rejection cases tested through the executable interface; and
3. adapter-parity scripts proving that storage plumbing does not change observable outcomes.

Tests should assert outcomes visible at the interface. Tests that only inspect parsing helpers,
sorting helpers, or file-layout internals should exist only when those details have their own
internal seam and independently variable adapters.

## Priority order

1. Rewrite the opening around the problem and the worked schema/entity scenario.
2. Declare the semantic and executable interfaces and their ownership split.
3. Reorganize current rules by reader-facing promise, with formal traces.
4. Move development history and implementation status out of the normative flow.
5. Decide whether naming belongs inside the executable store module.
6. Add boundary cases that force ambiguous requirements into explicit rulings.

## Finishing criterion for the eventual reorganization

The reorganization is complete when a new reader can answer the following from
`STORE-MODEL.md` without reading Lean or the development history:

- What problem does the store solve?
- What may be stored?
- What makes an insertion legal?
- What can a caller ask the model to do?
- What facts remain true after every legal operation?
- Which failures belong to the executable shell?
- Which promises are proved, pending, excluded, or dependent on a hypothesis?

The same reader should then be able to follow a link from each promise to its formal statement
without encountering a second, independently maintained version of the promise.

# OPERATOR GRILLING DOCKET — 2026-08-29 late
Assembled by foldlab-f7 (coordinator). Sources: the 13-file extraction sweep,
seat advice (foldlab-c7 received; 5 seats pending), coordinator verification
against main c042afa3. Recommendations are marked [f7] or [c7]; proof shapes
named per item. Full raw enumeration: docket-extraction (13 files, ~110 asks).

## STRUCK — asks already answered by landed or in-flight work (verified)
- CLI-AUDIT asks 1–5 — all ruled by decision 25, landed 73d72cc0/e55ccd57.
- FRONTEND 1 (rc.112) — landed cd48232d; package.json uniform. Residual:
  sources.lock rc.111 rows are BY DESIGN (Stage-1 extraction pin; note in
  lock row 264 already reconciles them). Nothing owed.
- FRONTEND 5 (cas_word) — built with theorems, in merge (704a4eb9).
- FRONTEND 11 (distribution) — decision 26 seat 2 landed the repo+bun+mise bar.
- BACKEND-ROBUSTNESS R2 (maxInFlight home) — decision 23 ruled the two
  ServePolicy fields; daemon seat implemented.
- R4 (liveness before bind) — honored by events: BS-1 landed before daemon bind.
- R3, R6, D6-register, working-tag — RULED by decision 23 wave 3 (work owed,
  not rulings; see Tier 3 dispatch list).
- R5 cheap half — FIXED tonight (rescue dd54bc5f, in review).
- SM items 6, 11, 17b, 18b, 19 (stages 1–2), 22, 26 (core), 27, 28, 30 — closed
  per the queue's own record + decision 25.
- D8/R7 stamp — discharged via EmitPrograms.lean (SM item 23's record).
- D2 gitignore hole — closed (verified: .staging/*.md rescued).
- D11 sessions convention — first entry exists; convention de-facto adopted
  (formal Category-3 set row: in Tier 3).
- BS-4, BS-5 — decided by BUILD-SEMANTICS Corrections 2/3.
- BS-9 — stale (tree clean).
- BOOTSTRAP 9 (MCP host in scope) — answered by events (cas serve + daemon).
- LANGUAGE-POLICE 9 — already struck in SCHEMA-MATERIALIZATION.
- D1 SECURITY — verified NOT tracked/staged/pushed; already gitignored.
  ONLY the token rotation remains, operator's act.

## TIER 1 — rule first (each blocks a live lane)

1. C6 RECURSION/REFERENCES (SM-2; the materializer's remaining half; libfree
   D2's counter feeds it; treesitter GROW C6; FRONTEND 6 adjacent).
   [f7] RULE AS PROPOSED: reference name = target's content address (or
   annotated name), Document.references assembled from store words at
   materialization. Most-converged-upon single ask tonight.
   PROOF: acyclicity/well-foundedness of reference resolution at admission +
   byte gate on a recursive fixture; the direction law already covers decode.

2. THE ANNOTATION-BAG DIVERGENCE (SM-21). Store Effect's annotation bag or
   strip at the door. Gates 100%-fidelity ingestion claims (decision 13).
   [f7] STORE (grow the Lean decoder): fidelity mandate says wildtype survives
   round-trip; stripping makes "100% fidelity" false by construction.
   PROOF: round-trip theorem on annotated fixtures; measured corpus delta
   (count of decls whose bag is non-empty) to price the decoder growth.

3. ROOTSTORE OVER SQL — the compare-and-set question (c7-C; BACKEND-ROBUSTNESS
   orbit). KvsBackend deliberately provides no RootStore; cas_list_roots (the
   browse verb) does not compile until ruled.
   [c7] Answer now; keep RootStore.list unimplementable rather than faked.
   [f7] Concur, and rule the CAS primitive explicitly: roots move by
   compare-and-set on the named head or the backend refuses the RootStore role.
   PROOF: not a theorem — a design ruling; the compile error IS the gate.

4. EMITPROG THROUGH PPROG (SM-23). Three spellings of programs, not two;
   emitter reads the table but does not lower from it. Blocks codegen (27g)
   claiming one identity.
   [f7] RULE THE ROUTE: EmitProg lowers from PProg; its own slice.
   PROOF: brain-stem P1 progAddr_inj + a byte gate showing emitted output
   identical via the PProg route (differential, like the 12/12 EmitLayer one).

5. CANON-1 (BUILD-MODELING-AUDIT §4): canonicalize authored provides/requires
   at the door, or record the plan cache as order-sensitive.
   [f7] CANONICALIZE AT THE DOOR — the price of not ruling is cache-hit
   defeat, and the estate's identity discipline already sorts at admission
   everywhere else (UNION-DESIGN: order is identity is a *ruling about unions*,
   not about authored bags).
   PROOF: canonicalization idempotence + progAddr stability under authored
   permutation (falsifiable: exhibit two authored orders, one address).

6. D1 RE-RULING, all six asks in one act (D1-OPTION-A-SCOPING §6).
   [f7] Rule: (i) NO FORK — Option A dies; decision 13 already made OXC the
   capability instrument; (ii) tree-sitter legs gate only themselves;
   (iii) upstream #364 as goodwill, unsequenced; (iv) Schema.ts is the OXC
   leg's to parse — D1b is a fact about an instrument, not the capability;
   (v) census counts stamped with grammar rev, provisional, refused unstamped;
   (vi) no binding fork.
   PROOF: OXC parses Schema.ts + the 6/6 wildtype set → measured, stamped
   parse-fidelity table (the instrument-vs-capability split made evidence).

7. ANNOTATION TAG + SUBJECT ARMS, bundled (SM-9 sharpened 0x58 + PLAIN-
   LANGUAGE 5). Both move addresses — one versioning event, not two.
   [f7] Mint AnnotationKindTag with Lean+TS counterparts in the same change;
   add program/theorem arms to Annotation.subject then. The convergent-naming
   lane (merged) already widened subject — verify remaining arms only.
   PROOF: P5 tag_trichotomy (registered ∨ working ∨ refused, exclusive) —
   turns the register from table into obligation; emitgate extension.

8. WORD-REGISTRY RECONCILIATION (new, from the merge floor): c7's independent
   word shape (bindings/next over bindingSchema) vs seat 3's landed spelling
   (receipt/history documents). One registered spelling must win at merge.
   [f7] Seat 3's spelling wins (it carries the theorems + the registry gate);
   c7's Word.toStore NON-INJECTIVITY theorem is commissioned as its licensing
   companion (witness: vectors/shared-chunk.json, 5 bindings/4 addresses,
   verified) plus prefix-wf (Word.wf w → Word.wf (w.take n)).

## TIER 2 — posture rulings (cheap; each closes a class)

9. REFUSAL TAXONOMY UNIFIED (c7-D; subsumes SM-14, B21): one Lean inductive,
   projected to TS CasError + cas-http status table, R11 byte gate on the
   mirror. [f7] concur. PROOF: totality by construction + mirror gate.
10. CI FRESHNESS POSTURE (BS-1/2/3): skipped gen:* OK locally, never CI;
    contents-hash (blake3) ON — freshness relation must not be weaker than
    identity relation. BS-2's mechanism needs the untested third option
    (fresh-clone mtimes) actually tested before ruling. [f7]
11. THE LEDGER PREDICATE (BOOTSTRAP 4 = PAPERWORK D3): SPECS.md's domain is
    AUTHORITY DOCUMENTS, with one Category-3 SET row per era subtree —
    not 270 rows. [f7]
12. OBLIGATION VOCABULARY + NAMESPACE (POLICE 1, 2, 3): closed word set as
    proposed; discharged stays in ledger (history over hygiene — audit-trail
    estate); SM- prefix before any index binds. [f7 — all three as proposed]
13. PLAIN-LANGUAGE PLANE + WITNESS + HOME (PL 1, 3, 8): register plane is
    Ast/PProg/Envelope; attested-constructs-only-by-witness; REGISTER.md
    emitted by emitregister, byte-gated. [f7 — as proposed; PL 2's mode/order
    rows are forced by identity, rule with it]
14. FLOAT CEILING POSTURE (SM-15b): declare the bound explicitly — "full
    Effect Schema coverage" is coverage-minus-floats until Value grows a
    float, which is a versioning event, not a patch. [f7]
15. UPSTREAM DEFECTS (SM-13 oneOf collapse, SM-20 empty-struct excess):
    report both upstream with minimal repros; exclude literal-oneOf from
    reliance on Effect text generation; keep admitting empty struct but
    record the hole (no gate can close it — honesty over theater). [f7]
16. ACCEPTED-EXCEPTION LISTS in one act (BOOTSTRAP 2, 5, 6, 7): every pin
    drift / excluded gate / gen asymmetry becomes a declared exception WITH
    REASON or scheduled debt WITH OWNER — the ratchet starts non-green
    honestly. [f7]
17. UI + PROTOCOL POSTURES (FRONTEND 2, 7, 10): browser tier 1 read-only as
    v0, tier 2 gated behind own ruling; generated-viewer-default/authored-
    override ratified; declare the 2025-11-25 MCP ceiling as a stated pin
    (add 2026-07-28 only when a consumer demands statelessness). [f7]
18. BUILD HYGIENE (BS-6, 7, 8): build steps authored+emitted never recovered;
    mise task cache refused by name on the record; surface gets its own task
    + cadence (77% of check:cas). [f7 — all as recommended]
19. LIBFREE SECOND GRILL (D2–D10): proceed as each recommendation stands,
    with two counters elevated: D4 (word-gate ceremony on emitted files adds
    no evidence — take the counter, L3 suffices there) and D9 (free fixture
    authoring = Goodhart pressure — require decoys land with a second
    author's sign-off). [f7]
20. REPLAY REACTIVATION BEFORE UTTERANCE (SM-25) — rule it now so no
    Utterance slice starts first. [f7: yes]
21. SM SMALL POSTURES: 1 (ratify admissible-subset table), 3 (Integer
    spelling: rev-1 bare isInt canonical), 4 (brands: YES to escape hatch —
    nominal identity is real), 7 (ratify three adopted rows), 8 (leave open
    by construction), 12 (promote wire-identity table to REGISTRY.md),
    15a (ratify the derived-union tag-string sort). [f7 one-liners, grill
    batch-style]

## TIER 3 — no ruling needed; dispatch list (work already licensed)
- litestream TOOLS.md row + lag metric (ruled, wave 3)
- working-tag register build (ruled, wave 3; shape ruled in Tier-1 item 7)
- SM-24 surface-walk Backend fold (rides E refactor; POLICE 4 concurs)
- SM-29 node-document put register (CLI grill ruled; wizardly-blackwell docs
  landed; implementation owed)
- SM-31 architecture-matrix row pairing; SM-32 outputSchema probe test;
  SM-33 law-ID-to-test binding (salvage carries prior art)
- FRONTEND 8 (emitted agent configs) + 9 (check:workbench + ledger same-change)
- PAPERWORK D4 (11 AGENTS.md pointers), D5 (R1–R14→R15 one-word), D9 (root
  strays: pdf → REFERENCES.md identifiers, delete untitled folder), D10
  (empty staging dirs)
- BOOTSTRAP 1 (repoRoot constant), 3 (delete hand table for emitted fixture),
  8 (doctor host is mise/bun — accept the honest limit)
- POLICE 5, 6, 7, 8 (gate posture confirm; missingDocs ratchet ACCEPT at
  ~775; one TOOLS row for the reflexive suite; record transplant
  verification PC-only)
- Operator-personal: rotate the Turso token, delete turso_tok.md.

## THE PROOF-OBLIGATION GRILL (PROPOSED-LOGIC + audit §4 + c7)
Commission as one Lean batch (statement triage first, per decision 26 method):
A. only_init_creates + locate_preserves_roots (CLI P1/P2 — the phantom-store
   class, theorem-ized)
B. tag_trichotomy (P5 — pairs with Tier-1 item 7)
C. progAddr_inj + lineAddr_sep (brain-stem P1/P2 — "the address is the
   program's identity" is currently ASSERTED)
D. Word.toStore non-injective (witness committed) + prefix-wf (c7)
E. HD-1 statement + HD-2 counter-witness (handleLlm half-exists)
F. FRAME-1's last step (Fragments.lean:186-189 states more than it proves —
   the one place tonight where prose is AHEAD of proof; small, real, closable)
G. SPEC-2 scoped (runS_scoped) — and refuse any SPEC-1 "free speculation"
   claim on the record
H. registers_agree (P4) + everyday_closure (P3) — harder; stage after A–G.
Deliberately NOT commissioned: RESID-1 stronger form (language boundary is
gate-only per DESIGN.md:362-365 — the weaker internal theorem only).

## LANGUAGE-DEVELOPMENT VALUE RANKING (f7 + c7; other seats pending)
1. Land the words (cas_word merge) — realization, not new work.
2. Published programs: queue 22/23 + host step/cont codec + F3's decode
   direction (Word → Option PProg is OWED — programs are content in the
   WRITE direction only; a saved program cannot re-run). [c7 sharpened]
3. Registers as law: tag trichotomy + working-tag register + refusal
   taxonomy — the BROKEN-SILENT class closers.
4. Full-fidelity OXC ingestion (with Tier-1 items 2 and 6 ruled first).
5. A VERDICT TYPE FOR PROGRAMS [c7 — the gap decision 27 misses]: nothing
   can state a computation's standing; provenance/economy/lifecycle are
   orthogonal axes; commission the ruling ask.
6. METER infer [c7]: handleLlm eliminates the vis node — make R15's
   answer-as-recorded-content a law of the handler, not a convention of the
   example. Cost/cache/replay fall out of one act.
7. Prop canonical spelling [c7, flagged HARD]: the Described-analogue for
   propositions — the load-bearing unknown; do NOT assume cheap (universe
   polymorphism, implicits, defeq).
8. cas search / self-reasoning gates, then codegen full push — consumers of
   1–4, sequenced after.

## PENDING FOLD-INS
Seat replies: foldlab-00, foldlab-bf, wizardly-blackwell-2d1862-d2,
effect-nats-48, effect-nats-38. Merge verdicts: daemon, cas_word. Reviews:
CLI naming seat ×2 lenses. Each lands as an addendum.

## ADDENDUM 1 — from the CLI-seat law review (lens 2 of 2)
NEW TIER-1 ITEM: **Does naming publish?** The naming seat publishes every
annotation unconditionally (roots as the one walkable surface — a reverse
index by side effect), against VOCABULARY collision 4 ("roots means published
entry points, and only that") and against the paperwork audit's ANSWER 2
("a named root would be a second, unproved index"), where the question was
gated on queue item 23. [f7] RULE, don't drift: either a decision-record row
"naming publishes, roots carry annotations until item 23's index exists"
(pragmatic, matches shipped behavior), or publication goes opt-in
(--publish) and the test's surprise (`cas ls` shows the annotation, verify
counts 2 nodes, user never typed publish) disappears. The reviewer showed
the seat's own test exhibits the surprise — that is the falsifier.
Review verdicts so far: CLI seat MERGE-WITH-FIXES (2 blockers: hand-written
everyday word off-registry; help verb outside the --json law it prints).
Rescue dd54bc5f MERGE-WITH-FIXES (message misses the fix-naming element;
"scheme" owes a VOCABULARY row; say the one-scheme-today bound out loud).

# The language surface: what was said, what we decided it meant

FROM OPERATOR-DIRECTED RESEARCH

Author: language-surface lane (Opus), 2026-08-14, isolated worktree. Design
only — prose, event shapes, and signatures; no machinery. Consumer-gated to
tickets 003 (the concierge), 004 (the owned canonical encoding), and 015 (the
grammar foundry). Discipline: every claim about determinism names where the
determinism lives, and the LLM is never one of those places. Labels follow the
unified fold's convention — **SHIPPED** (walled or tested in-repo),
**RATIFIED-UNBUILT**, **ASPIRATIONAL**.

The operator's framing, near-verbatim: *"I'm talking to you by dictating natural
language. That offers almost yet another surface — you can fold over that
deterministically, because the model is going to be interpreting. Someone's local
intelligence — I'm talking to you, you understand what I mean — and then the model
takes that and turns it into domain types."*

This document takes that seriously and takes it apart. The surface is real. The
fold over it is deterministic. The model is not, and the design's whole job is to
put the model somewhere the determinism can be stated exactly.

---

## 0. The one-paragraph answer

An utterance is bytes, so it is **evidence**: canonicalize it, digest it, journal
it, and anyone can recompute its identity forever (`packages/core/src/jcs.ts:116`,
ADR-0002). What a model emits when it reads that utterance is *also* bytes, and is
*also* evidence — a fact about what one model, at one configuration, on one day,
proposed. Neither of those is the hard part. The hard part is the **edge**: the
claim that *this value is what that utterance meant*. That edge is not recomputable
by anyone, it is exactly the kind of thing two parties can legitimately dispute,
and so under the three-sort ontology (NEXT.md:161-168) it is a **decision** and it
single-homes behind the effector. Everything else in the language surface —
transcript, proposal, fill, refusal, frontier, derived question — is evidence, and
therefore federates for free. **Exactly one CAS happens per adopted meaning; the
rest of the conversation costs no coordination at all.**

---

## 1. The utterance as evidence, the interpretation as a span

### 1.1 The sort placement, stated precisely

The natural reading — "the interpretation is a decision" — is nearly right and
imprecise in a way that matters. Take it apart:

| Thing | Sort | Why |
| --- | --- | --- |
| The transcript bytes | evidence | recomputable digest; equal bytes give equal digests anywhere |
| The candidate value the model emitted | evidence | a *fact about the model's output*, journaled per ADR-0005 |
| The refusal the certifier returned | evidence | the certifier is total and deterministic: refusal is a *function* of (candidate bytes, grammar, catalog head) |
| The frontier / the clarification question | evidence | derived — a semantic fold over the partial and the grammar |
| **The claim that this value is that utterance's meaning** | **decision** | not recomputable from any bytes; legitimately disputable |
| A digest not yet present (uncataloged ref, lagging journal) | absence | typed refusal; senders own retry |

So the decision is not the *value* and not the *act of interpreting*. It is the
**adoption of a binding between two pieces of evidence**. Both feet of that
binding are recomputable; only the edge between them is a commitment.

### 1.2 The finding: interpretation is a span, and foldlab already has this law

This shape is not new to the repository. Ticket 016's merge law says a merge is
admitted "only as (alignment span digest — a decision, effector-homed; recomputed
colimit digest — evidence, refused on mismatch)"
(`docs/map/tickets/016-the-ontology-explorer.md:46-48`). CONTEXT.md's merge fact
says the same thing one level down: "the committed linearization of a merge: the
ordered picks, not the merged content. The content is derivable; the fact is what
is stored and named" (CONTEXT.md:43-46).

**An interpretation is an alignment span between a language artifact and a typed
artifact.** `utterance ← interpretation → value`. The two feet are evidence; the
span is the decision; anything computed *from* the span (a fold, a projection, a
downstream record) is recomputable evidence again. The language surface therefore
needs no new sort, no new authority protocol, and no new law — it needs the merge
law applied to a pair of sorts nobody had pointed it at yet. That is the strongest
argument that this surface belongs in foldlab rather than beside it.

### 1.3 The refinement: `Proposed` and `Interpreted` are two different events

The mission's sketch has `Uttered → Interpreted → Confirmed`. Splitting the middle
term is load-bearing:

- **`Proposed`** records that a specific interpreter, at a specific configuration,
  emitted specific candidate bytes for a specific utterance. This is monotone
  evidence. Two federated daemons can hold *different* proposals for the same
  utterance with no conflict, because both are true facts. It is admissible with a
  plain check and no lock — the same monotone result the catalog already relies on
  (README:62-66).
- **`Interpreted`** records that a principal *adopted* one proposal as the
  meaning. This is the span. It is the only part that can conflict, and it
  compare-and-swaps.

The boundary between evidence and decision falls at **adoption**, not at
inference. Everything the model does is a fact about the model; only a principal
can create an obligation. This also makes the read path free: an interpretation
consulted and discarded (a query, a preview, a speculative render) never touches
the effector at all, because nothing downstream depends on it.

### 1.4 Provenance is committed, not attached

The precedent is already ratified for nondeterministic effects generally:
`docs/design/2026-08-13-effector-backed-workflow-replay.md:137-155` — such an
effect "journals its output as a fact", and "the activity's identity then commits
the inputs *and* the provider/config that produced the output (a config-hashed
key), so a replay that would have called a different model is a *different*
activity, not a silent substitution."

Specialized to language: the interpreter's identity is part of the work digest,
not a decoration on the record. A different model, a different temperature, a
different system prompt, a different grammar version is a **different unit of
work**, and therefore cannot silently overwrite an existing meaning. This is the
mechanism behind "re-interpretation is a new decision, never an overwrite" — it is
structural, not a policy anyone has to remember.

---

## 2. The event grammar

Records against cataloged types, in the `flb.type.v0` tradition (proto/SPEC.md:67-78).
Names below are proposed, not ratified. Every digest field is 64 lowercase hex.
`catalog_head` appears wherever certification happened, for the reason given in §2.4.

### 2.1 The evidence records

```
flb.capture.v0        Captured {                        -- voice only; §5
  medium:             "audio/opus" | ...
  audio_digest:       hex64                             -- the evidence root for voice
  capture:            { device, started_at, principal_claim, auth_basis }
}

flb.utterance.v0      Uttered {
  transcript_digest:  hex64                             -- SHA-256 over RFC 8785 bytes
  source:             Typed {}                          -- keyboard: transcript IS the root
                    | Transcribed { audio_digest, asr_provenance, adoption }
  principal_claim:    { subject, auth_basis }           -- see §5.4
  at:                 journaled arrival, not asserted wall time
}

flb.proposal.v0       Proposed {
  utterance_digests:  [hex64, ...]                      -- the turns this reads
  grammar_digest:     hex64                             -- the cataloged type being filled
  partial_digest:     hex64                             -- the state the model saw (§3)
  frontier_digest:    hex64                             -- the holes it was shown
  fills:              [{ path: [...], subtree: <flb.type.partial.v0> }, ...]
  interpreter:        { model, version, params_digest, prompt_digest,
                        decode_mode: "free" | "constrained", grammar_index_digest? }
  catalog_head:       hex64
}

flb.certification.v0  Certified | Refused {
  candidate_digest:   hex64
  grammar_digest:     hex64
  catalog_head:       hex64
  outcome:            { value_digest, scheme }          -- Certified
                    | { kind, law, path, got, expected, example }   -- Refused
}
```

`Refused` carries exactly the daemon's uniform refusal shape
(`proto/wire/CONTRACT.md:119-144`) — no second refusal vocabulary is introduced,
and W8 ("refusals are data") holds across this surface unchanged.

### 2.2 The decision records

```
flb.interpretation.v0  Interpreted {                    -- the span; effector-homed
  slot:               hex64                             -- what this meaning is FOR
  utterance_digests:  [hex64, ...]
  grammar_digest:     hex64
  value_digest:       hex64                             -- must be a Certified outcome
  proposal_digest:    hex64                             -- which proposal was adopted
  catalog_head:       hex64
  principal:          { subject, auth_basis }           -- authenticated, never inferred
}

flb.correction.v0      Corrected {                      -- effector-homed
  supersedes:         hex64                             -- the interpretation digest it replaces
  value_digest:       hex64
  proposal_digest?:   hex64                             -- absent when the human typed the value
  principal:          { subject, auth_basis }
  reason?:            string
}

flb.confirmation.v0    Confirmed {                      -- effector-homed
  interpretation:     hex64
  principal:          { subject, auth_basis }
}
```

`Confirmed` is deliberately separate from `Interpreted`, and §6.2 states why the
distinction is not ceremony.

### 2.3 Register keys, and why correction is not an overwrite

The effector's register is `Absent | Claim(fence, owner, lease) | Done(fence,
result)` (README:40-47; `go/effector/effector.go:18-37`), one unit of work per
digest, exactly one terminal outcome (`Commit` at `:186`, revision-CAS at `:220`).
Terminality is not an obstacle here; it is the feature. Two key families:

1. **Adoption.** `work = SHA-256(canonical({kind:"interpret", slot, grammar_digest,
   utterance_digests}))`. Terminal once. "Under grammar `g`, these turns were
   adopted as `v`" is a historical fact about a decision that was taken, and
   historical facts must not be editable — that terminality is precisely what makes
   the audit trail sound.

2. **Correction.** `work = SHA-256(canonical({kind:"correct", supersedes,
   value_digest}))`. A correction is a *new* unit of work whose digest commits what
   it supersedes. You cannot express an overwrite in this vocabulary; you can only
   express an append that names its predecessor.

The current meaning of a slot is therefore a **fold over the correction chain**,
not the contents of a cell. That is the house shape: an entity is the fold of one
correlation key's events (README:29-30), and this is that, at the granularity of
meaning.

**Corollary — a dispute is a CAS collision.** Two principals who disagree about
what an utterance meant will attempt corrections that supersede the same
predecessor. If they propose different values, the digests differ and both land as
distinct facts, and the slot's fold sees a fork it must be told how to resolve. If
they race the same superseding claim, one commits and the other is refused with the
incumbent outcome (`ErrCommitted`, `effector.go:42`). Either way, disagreement
surfaces as a typed refusal or an explicit fork — never as a lost update, and never
as two daemons quietly believing different things. Human disagreement about meaning
gets exactly the machinery foldlab already built for machine disagreement about
order.

### 2.4 Certification is catalog-relative, and the record must say so

A candidate that contains `{"k":"ref","digest":...}` certifies only if that digest
resolves (`proto/wire/CONTRACT.md:163-167`); the concierge's frontier likewise
offers `refs` drawn from the catalog and guarantees byte-identical replies only
"against the same catalog" (`:70-73`, law C1). So `certify` is a function of
(candidate bytes, grammar, **catalog head**), and two daemons at different catalog
heads can legitimately disagree about whether the same candidate certifies.

Therefore `catalog_head` is a required field on every certification and every
adoption, not an optional annotation. Without it, "this certified" is not a
recomputable claim, and the decision loses the one property the whole design exists
to give it. This is a small field and a load-bearing one; it is the kind of thing
that is cheap now and archaeology later.

### 2.5 What the chain gives you

Three properties, each falling out of the shape rather than added to it:

- **"What was said" is separable from "what we decided it meant", forever.** They
  are different records with different sorts. An auditor can fetch the utterance
  without accepting the interpretation, and can produce a competing interpretation
  of the same utterance digest without touching the original.
- **Re-interpretation is an append.** A new model, a new grammar version, a new
  prompt is a different work digest (§1.4), so it cannot collide with the old one
  and cannot silently replace it. Re-running last year's conversation through this
  year's model produces a *second* meaning next to the first, and the difference
  between them is computable.
- **Compaction has three honest tiers.** The fill/refusal trace is derivable from
  the proposals (fills are pure — C1), so it is compactible: replacing that prefix
  by its (head, fold state) pair loses step-through and nothing else
  (CONTEXT.md:48-50; `packages/core/src/stream.ts:334`). Utterances and proposals
  are irreducible input and are not derivable from anything. Adoptions are
  decisions and are never discardable. The storage policy is read off the sorts.

---

## 3. Where the determinism actually is

The model sits inside the pipeline and the model is not deterministic. The claim
this design makes is not that the pipeline is deterministic. It is:

> **`System = D₂ ∘ M ∘ D₁`**, where `D₁` and `D₂` are total deterministic
> functions and `M` is the model. `M`'s entire output is journaled as evidence.
> Therefore `replay(utterance, grammar, catalog_head, m_out) = D₂(D₁(...), m_out)`
> is exactly recomputable, and the system's behaviour is a function of
> (utterance digest, grammar digest, catalog head, candidate bytes) alone.

The non-determinism has exactly one job — choosing candidate bytes — and that job's
output is a recorded fact. Everything upstream of `M` and everything downstream of
`M` is a catamorphism over committed data. Three anchors bracket it.

### Anchor 1 — the transcript digest: what was said is fixed

`digest(u) = SHA-256(RFC 8785 canonical bytes)`. This is the ordinary value
identity of the repository (`packages/core/src/jcs.ts:116`; ADR-0002), and
constrained decode is what makes it a boundary rather than a convention: exactly
one JSON value, valid UTF-8, unique member names, finite binary64, with a typed
refusal otherwise (`jcs.ts:349`, refusals at `:16-27`; CONTEXT.md:25-31 — "a
decoder that repairs its input is naming a different value than the one that
arrived"). **Label: SHIPPED** (R1 JCS differential wall against RFC 8785
Appendix B as an independent oracle).

What is fixed is the *identity* of the text, which is exactly the thing that is
never in dispute even when the meaning is. Note the honest degradation for voice:
in the dictation case this anchor holds over the *audio*, and the transcript is
already one interpretation layer above it (§4).

### Anchor 2 — the certifier: the model proposes, the grammar disposes

This anchor has two candidate locations and **only one of them can carry the
claim.** Distinguishing them is the sharpest finding in this document.

**2a — decode-time masking (not the anchor).** A GBNF/FSM index derived from the
grammar digest constrains the sampler, so ill-formed bytes are unreachable at
generation (ticket 015 deliverable 4; `docs/map/tickets/015-the-grammar-foundry.md:38-42`).
**Label: ASPIRATIONAL.**

**2b — admission-time certification (the anchor).** `certify(bytes) → Certificate
| Refusal`, the one proved entry point admitting bytes to the catalog, "whoever
synthesized the bytes is permanently untrusted, the trusted base's size is
published, and no second admission path is ever added" (CONTEXT.md:180-186;
ticket 015 ratification 1). **Label: interim certifier SHIPPED in `proto/`**
(W1/W2, canonical-or-refused, `proto/SPEC.md:42-46`); the closure-law fold that
makes admission regularity-preserving is ASPIRATIONAL.

**If 2a were the anchor, the guarantee would rest on three untrusted artifacts:
the sampler implementation, the grammar-to-automaton compiler, and the tokenizer.**
A tokenizer that can emit a byte sequence the automaton did not anticipate, a
compiler bug, or a runtime that silently falls back to free decoding would each
break a guarantee that was supposed to be structural. Worse, leaning on 2a would
also import a cost with no compensating proof: grammar-constrained decoding
distorts the model's conditional distribution (Grammar-Aligned Decoding, NeurIPS
2024; VERIFICATION.md:351-353).

Because certification is the sole admission point, none of that can reach the
catalog. An unconstrained model, a hallucinating model, a model swapped for a
different vendor mid-conversation, or a malicious client hand-writing candidate
bytes changes **yield**, never **admissibility**. Constrained decoding is an
efficiency device: it raises the fraction of proposals that certify, and it is
worth building for that reason alone. It is not the guarantee.

So the slogan is earned in this exact form:

> **The model proposes; the grammar disposes — at admission, not at sampling.**

That the byte-level guarantee is hard-won rather than free is documented in the
number-determinism dossier: ECMA-262's minimal-`k` guideline underdetermines 45.8%
of doubles, and engines agree today only by a fragile coincidence
(`docs/research/2026-08-13-number-determinism-dossier.md`; unified fold §2.3).
RFC 8785 canonicalization plus a constrained *decoder* plus the differential wall
are what close that latitude.

### Anchor 3 — the fold of committed interpretations

Given the same committed decisions, state is exactly reproducible. This is the two
folds, unchanged: the identity fold `extend(h,e) = SHA-256(h ‖ enc(e))`
(`packages/core/src/stream.ts:112-116`) and the meaning fold
(`applyKV`/`foldKV`/`stateDigest`, `:256-277`), with compaction preserving both
across a discarded prefix (`:334`). **Label: SHIPPED.**

What makes "the same committed decisions" a well-defined phrase at all is the
register: no commit below the highest fence, exactly one terminal outcome, as an
Apalache inductive invariant replayed lockstep against the running Go across
15,378 schedules (README:51-55; `go/effector/effector.go:177,220` are the two
revision-CAS points that carry it;
`docs/research/2026-08-13-effector-certified.md:37-43`). Without that theorem,
"the committed decisions" would be a phrase about a race.

### Corollary — the certifier's position also fixes *order*

The pipeline order is: **canonicalize → digest → journal the utterance → propose →
apply proposals in identity order → certify each → journal outcomes → adopt.**

Apply-in-identity-order is not housekeeping. The frontier already enumerates holes
in a deterministic depth-first order with struct fields in UTF-16 code-unit order
(`proto/wire/CONTRACT.md:79-81`), which is the same identity order that makes "the
first path that refuses" a well-defined fact so that "construction history never
leaks into evidence" (CONTEXT.md:173-177). Applying a multi-hole proposal in that
order makes **which fills landed and which refused a function of the proposal set
rather than of the order the model happened to emit them in.** A model that emits
the same fills in a different sequence produces byte-identical journal traffic.
That is a free determinism win, and it exists only because the certifier sits
after a canonical ordering rather than at the point of emission.

---

## 4. The concierge as the repair loop

### 4.1 The interplay, in one rule

When interpretation is ambiguous or partial, the surface **does not guess**. The
concierge's existing vocabulary already provides everything needed: a hole
`{"k":"hole"}` in a partial tree, `type.fill` returning a new partial plus a
frontier where each hole is annotated with legal kinds, examples, and fitting
cataloged refs, `type.unfill` as the exact inverse, and finish = zero holes =
`type.create` (`docs/map/tickets/003-the-wrapper-prototype.md:29-45`;
`proto/wire/CONTRACT.md:47-85`).

The natural-language layer contributes exactly one thing: **an utterance is a
multi-hole fill proposal.** A human sentence naturally fills several holes at once
("a two-day deadline for the billing job") where the concierge's verb fills one.
The resolution is deliberately boring: the batch is a **client-side convenience
above the writ**, and the daemon applies the proposals through the existing
`type.fill` one at a time, in identity order. The writ does not grow — W9 says the
writ is three verbs and "a missing capability is a missing request kind on the
daemon" (`proto/SPEC.md:60-62`), and this is not a missing capability, it is sugar
of the kind `session.ts` already is. No new authority, no new law, no new refusal
kind.

Each fill certifies or refuses **independently**. A proposal that fills four holes
where two are unambiguous and two are not lands the two and refuses the two, and
the refusals are the daemon's ordinary teaching refusals carrying path, law,
`got`, `expected`, and a directly-acceptable `example` (W7; `CONTRACT.md:119-144`).

### 4.2 The clarification question is derived, not authored

The frontier is a derived artifact — successor states of the tree automaton
compiled from the declared grammar, "never a hand-written table"
(`docs/map/tickets/003-the-wrapper-prototype.md:58-60`). Each remaining hole
already carries its `legal[]` set with examples. So *"did you mean `X:Duration` or
`X:Deadline`?"* is not a prompt someone wrote; it is `frontier[i].legal` rendered
into language — a semantic fold over the frontier, recomputable from (partial,
grammar, catalog head).

Two consequences. First, **an under-specified answer cannot be hidden**: you can
prove the system asked exactly the questions the grammar left open, because the
question set is a function of the state. Second, the **prefix property** — every
offered fill admits a closed completion, discharged as tree-automaton emptiness
(ticket 003 amendment; type-constrained generation, PLDI 2025) — means the dialogue
never walks the human into a dead end discovered six turns later. Combined with
SENSIBILITY (every reachable partial is well-formed, so every intermediate has a
digest), every rung of the dialogue is addressable by hash and shareable.

The teaching loop is not a UX nicety here. Positive-example-only grammar authoring
is unlearnable in principle (Gold 1967), which is why "the endpoint must never
accept description-in/DSL-out without a refusal round-trip"
(`docs/research/2026-08-13-language-ontology-frontier.md:44-57`;
VERIFICATION.md:348-350). The refusal *is* the counterexample, and the daemon is
the minimally adequate teacher the L\* literature spends LLM calls trying to
approximate.

### 4.3 A round trip, as events

```
Uttered            u1 = "give the billing job a two day something"
Proposed           reads (partial₀, frontier₀); fills path ["fields","job"]     [evidence]
                   and path ["fields","window"]; interpreter provenance pinned
  daemon applies in identity order:
Certified          ["fields","job"] ← {"k":"ref","digest":…billing}             [evidence]
Refused            ["fields","window"] kind=invalid-structure,                  [evidence]
                   law="union member must be one of the declared alternatives",
                   expected=[Duration, Deadline], example={"k":"ref",…}
Asked              derived from frontier₁: "a two-day window — is that a         [evidence]
                   Duration (how long) or a Deadline (by when)?"
Uttered            u2 = "by when — end of Thursday"                             [evidence]
Proposed           fills ["fields","window"] with Deadline{…}                   [evidence]
Certified          frontier is now empty                                        [evidence]
Certified          type.create over the closed term → value_digest              [evidence]
Interpreted        slot ← value_digest, principal=alice, catalog_head pinned    [DECISION]
```

Read the right-hand column. **The entire repair loop is evidence.** It federates,
it replays, it needs no lock, and it costs no coordination. Exactly one line is a
decision, and it is the last one. Coordination cost is O(1) per adopted meaning,
not O(1) per turn — which is what makes a chatty, patient, many-turn clarification
dialogue architecturally cheap rather than architecturally alarming.

### 4.4 What the human answers

The human answers refusals in language, and the loop closes. The important
discipline is that the human's answer re-enters as an `Uttered` — it is not a
special "correction channel" with different rules. A clarification is an utterance
like any other, and it is evidence like any other. There is exactly one way into
this system for language, which is the same property the certifier has for bytes.

---

## 5. Voice

### 5.1 The pattern stacks, and the stack is honest about the extra model

An ASR transcript is model output. So the transcript is not the evidence root in
the voice case — the audio is:

```
Captured      audio_digest                                        evidence  (root)
Transcribed   audio_digest → transcript_digest, asr_provenance    DECISION  (adoption)
Uttered       transcript_digest                                   evidence
Proposed      transcript_digest → candidate                       evidence
Interpreted   utterance → value                                   DECISION  (adoption)
```

Two ASR runs over the same audio produce different transcripts; both are true facts
about what an ASR system emitted; which one we treat as *the* utterance is
disputable, hence a decision, hence effector-homed with the ASR's provenance in the
work digest. The pattern stacks without modification because the law was stated
about *edges*, not about *layers*.

The honest summary: **for typed input there are three anchors and one model; for
voice there are three anchors and two models, stacked.** The anchors do not move.
Anchor 1 relocates from the transcript to the audio, and the transcript joins the
non-recomputable middle. Nothing else changes. That the law survives the stacking
untouched is the evidence that it was the right law.

### 5.2 Streaming dictation: what commits and when

Streaming ASR emits hypotheses that are *revised*, not appended — "recognize the
speech" becoming "wreck a nice beach" and back. A grow-only journal cannot
represent revision by mutation, and should not try.

The precedent is already in the effector: `Watch` is chatter, and "authority is
only ever `Lookup`" (`go/effector/watch.go:41-53`;
`docs/research/2026-08-13-effector-certified.md:33`). Apply it verbatim. **Interim
ASR hypotheses are chatter: rendered to the user for live feedback, never
admitted.** They are not evidence, because they are not stable enough to be a fact
about anything.

The commit rule, in one line:

> **Evidence commits when it stops changing; decisions commit when a principal
> says so.**

Concretely: the ASR's own endpointing produces a **utterance-final segment**, and
*that* segment is digested and journaled as `Uttered`. It is a fact — this is what
the recognizer settled on — and journaling it does not commit anyone to anything,
so it can happen at streaming latency without a human in the loop. Adoption of the
resulting interpretation waits for the principal. You get low-latency evidence
accrual and human-gated commitment, and the two never need to be traded off against
each other.

Incremental folding falls out for free. A dictation session is a sequence of final
segments, so folding it is the free-monoid fold — `ĝ(u·v) = ĝ(u) ⊕ ĝ(v)` — with
O(1) head extension and an invalidation-free cache keyed on (fold digest, head)
(`packages/core/src/foldCache.ts`; unified fold §1.1 Face C). And the *authoring*
state carries alongside for free too, because the concierge already made it travel:
"the partial IS the state and travels in every request/reply, so the daemon holds
no sessions" (`docs/map/tickets/003-the-wrapper-prototype.md:31-34`). A long
dictation over an unreliable connection needs no server-side session, because
statelessness was ratified for a different reason and happens to be exactly what
streaming wants.

### 5.3 Retention, and the cost of discarding audio

Audio is the evidence root and is frequently the thing an operator least wants to
keep. Compaction is the mechanism and it is honest about the price: discard the
audio bytes, keep `(audio_digest, transcript, Transcribed decision)`, and what is
lost — "only ever by explicit choice" (CONTEXT.md:48-50) — is precisely the ability
to re-transcribe.

Name that cost plainly: **discarding the audio makes the transcript
unfalsifiable.** Nobody can produce a competing transcript, so the adopted one
becomes unchallengeable by construction. The digest still proves *which* audio it
was, which preserves the integrity claim and destroys the dispute claim. That is a
defensible trade and it must be a stated one.

### 5.4 Speaker identity is a decision, and voice is not authentication

Diarization output ("speaker 1", "speaker 2") is model output, hence a proposal.
Binding "speaker 1" to a principal is a decision, and it is the one decision that
must never be derived from the audio. A voiceprint match is evidence about a
signal, not authentication of a person.

The rule, following the substrate assumption gate's discipline of turning
assumptions into executable laws (ticket 011): an `Uttered` record carries a
*claimed* principal together with its `auth_basis`. An utterance may always be
journaled anonymously — evidence never requires a principal. But **an adoption
whose principal is asserted rather than authenticated refuses**, naming the
uncovered assumption, exactly as the substrate gate refuses an `Acquire` whose
premise no proof covers. You can record that someone said something; you cannot
commit an obligation on their behalf without an authenticating fact from outside
the audio.

---

## 6. What this does not promise

Stated plainly, and sized to the evidence. Another lane owns the MCP spec; this
section owns the edges.

1. **The model's understanding is not proven, and certification does not claim it
   is.** Certification is shape-correctness plus whatever declared checks the
   grammar carries. If a grammar declares no law about deadlines being in the
   future, a certified `Deadline` in the past is a certified value. Forced validity
   is a syntactic claim, never a semantic one (GAD, NeurIPS 2024;
   VERIFICATION.md:351-353).

2. **A certificate is not a confirmation.** The certifier licenses *shape*; only a
   principal can license *meaning*. That is why `Confirmed` is a separate record
   with a separate principal, and why an interpretation that certifies is still
   only a proposal until someone adopts it. Conflating the two would be the single
   most damaging error available in this design.

3. **Two humans can legitimately dispute an interpretation — that is why it is a
   decision.** The design does not resolve disputes; it makes them visible as
   fenced collisions and explicit forks rather than as divergent state (§2.3).

4. **Recomputability of what was built, never fidelity to intent.** The semantic
   gap — whether the induced value means what the utterance meant — is irreducible
   (VERIFICATION.md:353-356). The field's word is "grounded"; ours is
   "recomputable", which is strictly stronger and strictly narrower.

5. **Replaying a journaled model output proves what was recorded, never that
   re-calling would agree.** This is the workflow-replay edge specialized to
   language (`2026-08-13-effector-backed-workflow-replay.md:156-160`): the surface
   is a record-consistency claim, not a reproducibility claim about the model.

6. **The transcript is not the utterance, in voice.** Anchor 1 holds over the
   audio; the transcript is already an interpretation (§5.1). Any claim phrased as
   "what was said is fixed" is true of typed input and true of voice only with the
   audio retained (§5.3).

7. **Termination is a budget, not a theorem.** The prefix property guarantees no
   dead ends in the grammar; it does not guarantee the human answers, the model
   converges, or the loop ends. Unrealizability — no term in this grammar satisfies
   this description — is a first-class refusal with proof (ticket 015 ratification
   3), but exhaustion of a turn budget is an ordinary typed refusal, and the surface
   needs one.

8. **Certification is relative to a catalog head** (§2.4). "This certified" is a
   claim about a daemon at a point in its catalog history, and a record that omits
   the head has silently downgraded a recomputable claim to an attestation.

9. **The LLM is not deterministic and this document never claims otherwise.** The
   determinism claim is the relative one in §3: three deterministic anchors bracket
   a non-deterministic model whose entire output is journaled. Determinism is a
   property of the model's *complement* in the pipeline.

---

## 7. The MCP binding (pointers only)

A separate lane deep-reads the specification; this is a page of where the pieces
land, with the open questions marked as open. Nothing here was verified against the
MCP spec text.

- **Tools = commit verbs, and they need no MCP work.** The daemon serves its own
  contract as data and the tool schemas are derived from that reply at startup, so
  a daemon that grows a request kind grows a tool
  (`proto/ts/src/mcp.ts:1-58`; README:76-80). `interpret`, `fill`, `create`,
  `adopt` become MCP tools by existing as request kinds. Refusals already travel as
  tool-result data rather than protocol errors (`mcp.ts:7-9`), so W8 extends across
  this seam unchanged.
- **Elicitation = the clarification subdialogue.** The frontier's `legal[]` set is
  already renderable to JSON Schema through the existing codegen target
  (`proto/ts/src/codegen.ts`), so an elicitation request is a semantic fold over the
  frontier rather than a hand-written form. **Open question for the spec lane:**
  MCP elicitation is understood to restrict its schema to flat, primitive-typed
  properties; the frontier's legal fills are tree-shaped. If the restriction bites,
  the fallback is a tool round-trip carrying the frontier verbatim, which loses the
  client's native prompt UI and loses nothing else.
- **Sampling = server-side interpretation, with a provenance regression to flag.**
  Sampling is attractive because it keeps the model outside the trusted base by
  construction — the daemon never holds a model credential. But under sampling the
  *client* chooses the model, so `interpreter` provenance becomes a **claim by the
  client rather than a fact observed by the server**. Under no-asserted-identity
  (W1) that is the wrong direction. The recommendation is not to forbid it but to
  mark it: either record the interpreter provenance with an explicit
  `asserted:true` so its weaker status is in the bytes, or run interpretation
  server-side where provenance is observed. **This is a real finding for the MCP
  lane, not a preference.**
- **Resources = grammars by digest.** The GBNF/FSM index served by digest (ticket
  015 deliverable 4) is naturally a resource with a digest URI, letting an agent
  runtime pin to a foldlab DSL by hash.
- **Not MCP's job:** adoption. The effector CAS is a daemon request kind reached
  through a tool; no MCP primitive should be load-bearing for a commitment.

---

## 8. Summary — the three anchors, as finally stated

1. **The transcript digest.** What was said is fixed, by canonical bytes and
   constrained decode, with a typed refusal for anything that does not decode
   exactly. *SHIPPED.* (For voice, this anchor holds over the audio.)
2. **Admission-time certification.** Whatever the model emits either certifies into
   the grammar or is refused — and the guarantee lives at `certify`, the sole
   admission point, **not** at the sampler. Constrained decoding raises yield; the
   certifier is what makes ill-formedness impossible. *Interim certifier SHIPPED;
   closure-law admission and the decode-time index ASPIRATIONAL.*
3. **The fold of committed interpretations.** Given the same committed decisions,
   state is exactly reproducible — the identity fold and the meaning fold,
   unchanged, over a history whose commit order is guaranteed by a machine-checked
   register. *SHIPPED.*

The model sits between anchors 1 and 2. Its output is journaled as evidence, its
provenance is committed into the work digest, and the only thing it can produce
that anyone downstream is bound by is a proposal that a principal chose to adopt.

**The chain remembers what the fold forgives — and now it also remembers what the
model guessed, separately from what we decided to believe.**

---

## Appendix — grounding ledger

**Repo instances:** `packages/core/src/jcs.ts:116` (canonical encode), `:349`
(constrained decode), `:16-27` (typed refusals); `packages/core/src/stream.ts:112-116`
(identity fold), `:256-277` (meaning fold), `:334` (compaction);
`packages/core/src/foldCache.ts` (invalidation-free cache);
`go/effector/effector.go:18-37` (register states), `:108` (Claim), `:177`/`:220`
(the two revision-CAS points), `:186` (Commit), `:248` (Lookup);
`go/effector/watch.go:41-53` (chatter vs authority); `proto/SPEC.md:41-65` (W1–W10),
`:67-78` (`flb.type.v0`); `proto/wire/CONTRACT.md:47-85` (concierge fill/unfill and
frontier), `:80-82` (frontier order), `:119-144` (uniform refusal),
`:164-167` (refs resolve), `:176-179` (interim identity scheme);
`proto/ts/src/mcp.ts:1-58` (tools derived from `contract.describe`).

**Repo doctrine:** CONTEXT.md:25-31 (constrained decode), `:43-46` (merge fact),
`:48-50` (compaction), `:171-176` (identity order), `:178-184` (certifier);
NEXT.md:161-168 (the three sorts), `:180` (named bindings go through the effector);
README:29-30, `:44-47`, `:48-66`, `:76-80`; ADR-0002 (identity is canonical bytes),
ADR-0005 (the journal is load-bearing for LLM traffic), ADR-0006 (SDK surfaces are
derivation targets), ADR-0009 (journal roles);
VERIFICATION.md:348-356 (stated limitations).

**Tickets:** 003 (`:29-45` stateless guided construction, `:46-60` the three
concierge laws and the derived frontier), 004 (owned canonical encoding), 011
(substrate assumption gate — assumptions as executable laws), 015 (`:19-26` the
certifier as sole path, `:27-33` the mandatory teaching loop, `:38-42` derived
artifacts, `:47-51` stated limitations), 016 (`:46-48` merge as a span plus a
recomputed colimit).

**Design precedent:** `docs/design/2026-08-13-effector-backed-workflow-replay.md:137-160`
(nondeterministic effects journal their output; identity commits provider/config;
replay is a record-consistency claim); `docs/design/2026-08-13-the-unified-fold.md`
§1.1–§1.2 (the two folds as one catamorphism), §2.3 (byte-guarantee is earned),
§2.4/§4 (the semantic gap as the honest cap);
`docs/research/2026-08-13-effector-certified.md:33,37-43` (Watch is chatter; the
fencing law holds on the binary);
`docs/research/2026-08-13-language-ontology-frontier.md:44-64` (Gold/Angluin, the
daemon as the minimally adequate teacher; the evidence/decision mapping for
exploration answers);
`docs/research/2026-08-13-number-determinism-dossier.md` (how much latitude the
byte-guarantee actually closes).

**Literature (all reached through existing repo citations, none newly fetched):**
Gold 1967 and Angluin L\* 1987 (unlearnability and the minimally adequate teacher);
Hazelnut, POPL 2017 (sensibility, construction reachability); type-constrained
generation, PLDI 2025 (the prefix property); Jourdan–Pottier–Leroy, ESOP 2012
(untrusted synthesizer, small proved certifier); Grammar-Aligned Decoding, NeurIPS
2024 (constrained decoding distorts the conditional distribution); Goguen
institutions (merge as a span with a recomputed colimit).

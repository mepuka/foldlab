# Gauntlet verifier-integrity decisions — GitHub #37

## D1. The R2 corpus anchor is verifier-owned

Decided: the public R2 verifier uses the ratified corpus SHA-256 constant;
the manifest may repeat but cannot choose it. Synthetic verifier tests call a
package-private helper with their independently computed fixture pin.
Alternatives: trust the manifest (the demonstrated G-01 defect); add a CLI
flag (more operator surface for a corpus that the frozen contract already
pins). Why: the contract provides exactly one external anchor and the gate can
carry it directly. **Load-bearing? yes.**

## D2. Storm actors resolve to evidence-known names

Decided: G1 worker actions must target a worker present in the physical
ledger; its server restart target is exactly `nats-server`. R1/R2's
single-process controller contract uses exactly `worker`. All timestamps must
be positive and nondecreasing. Alternatives: syntax-only target validation;
count actions while discarding target/time (G-04). Why: floors count actions
against real actors, not arbitrary narrative strings. **Load-bearing? yes.**

## D3. Bind K to distinct variant shapes, not every physical work digest

Decided: require a stable template at each `(variant, step)` and require every
variant's ordered template vector to be distinct. Keep the frozen work
preimage `H({inputs, model, template})`, which already binds the step content
and is the content address that licenses shared-prefix reuse. Alternatives:
put the integer variant index in every work digest (the literal #37
suggestion); trust producer-chosen K. Why: distinctness closes the demonstrated
K=100 identical-variant inflation, while index-per-call makes unchanged
prefixes artificially distinct and destroys the ratified R1 2.5x reuse
mechanism. The coordinator explicitly chose the narrow, spec-preserving
repair after this contradiction was demonstrated. **Load-bearing? yes.**

The incompatible literal index-preimage suggestion remains unapplied and is
reported as such; neither the frozen artifact/spec nor the reuse floor was
silently rewritten.

## D4. G-07 is a finding; G-08 is not a completion law

Decided: preserve and stop on the G-07 red probe because no external artifact
anchors deterministic mutation moves. Do not repair without a disposition.
For G-08, keep `stop=max_tokens` legal: `stop` is strict and chain-bound, and
the R2 record explicitly reports legal truncated outputs; the verifier scores
the received output and never claims call completion. Alternatives for G-07:
accept a `move:*` prefix (still self-asserting); require every mutation receipt
(strong but removes deterministic moves). Alternative for G-08: require
`end_turn` (an unratified law contradicting existing evidence). **Load-bearing?
yes for G-07; no for G-08.**

## D5. Reconstruct the R2 corpus inside the gate

Decided: keep competition-owned problem text gitignored. The negative-controls
gate runs the checked-in corpus fetcher, which canonicalizes the named public
dataset and refuses unless the bytes match `R2CorpusSHA256`; the same verified
bytes then feed both committed R2 bundles. The gate also runs the
self-declared-corpus and anchor-pin controls. Both real bundles currently
violate frozen laws, so the gate accepts only the exact two known-red
classifications in `FINDING-R2-ARTIFACTS-001.md`; a pass or different refusal
fails the gate. It never labels either bundle verified.
Alternatives: commit the problem text (ownership concern); leave R2 human-only
(the demonstrated GitHub #58 coverage void); trust a manifest digest (the
closed G-01 defect). Why: the fetch recipe plus verifier-owned digest is the
ratified durable reference and keeps both provenance and automation explicit.
**Load-bearing? yes.**

# Law-enforcement decisions — GitHub #61

## D6. Qualify registry IDs; do not rename frozen source IDs

Decided: the laws index uses `proto-wire:W1` / `catalog-model:W1` and
`concierge:C1` / `entity:C1` as context-qualified registry identifiers. The
checker requires both sides of every known collision. Coordinator-owned
specifications retain their source-local `W1`–`W5` and `C1` tokens.
Alternatives: leave citations context-dependent (the reported ambiguity); edit
the frozen specs and every downstream fixture/test (a contract change not
ratified by this task). Why: aliases make new citations unambiguous without
claiming authority to rewrite the laws. Actual source-ID renaming remains a
coordinator-ratification boundary. **Load-bearing? yes.**

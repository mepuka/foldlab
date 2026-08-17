# Dispatch 29 — Plait slice 0: the spine (executor spec)

Status: dispatched 2026-08-17 under the Plait ratification record
(`docs/design/2026-08-17-plait-ratification-record.md`; program docs:
`2026-08-17-plait-coordination-fabric.md` §6–§8,
`2026-08-17-plait-architecture.md` — the architecture record is BINDING
for this slice). Board: project `plait`, epic E2. The issue body is
this spec.

## Objective

`packages/plait` exists, carries the wire spine — envelope schema,
digest discipline, subject grammar, a working local-NATS round trip —
and is walled cross-runtime from its first commit. No folds, no KV, no
sessions: the spine only.

## Spec-fixed decisions (the executor edits none of these)

1. **Home and module map**: `packages/plait` exactly per the
   architecture record §2. Only the modules this slice fills exist
   (`index`, `Digest`, `Canonical`, `Refusal`, `Wire`, `Subjects`,
   `FabricClient`, `internal/*`); absent modules are absent, not
   stubbed.
2. **Dependencies** (ruling G7): `effect` at the workspace catalog pin
   `4.0.0-rc.108`; `@nats-io/{transport-node,nats-core,jetstream,kv,obj}`
   at `3.4.0` exact. Nothing else. Confirm every Effect API against
   `node_modules/effect/dist/*.d.ts` and `repos/effect` — never memory.
3. **No second canonicalizer.** `Canonical.ts` is a seam over
   `packages/core`'s RFC 8785 jcs. Identity = SHA-256 over canonical
   uncompressed bytes; nothing ever fingerprints a transport form.
4. **Envelope v0** per part 1 §7.1: closed struct
   `{v: 0, kind: "emit"|"attest"|"checkpoint"|"sealed", lane, key,
   holder, body | {blob}, cert?, pins}`; constrained decode with excess
   properties refused; `holder` is a bare string carried verbatim
   (attribution ruling G4); inline/blob threshold 256 KiB of canonical
   bytes; the envelope's digest is its message id
   (`Nats-Msg-Id` header).
5. **Subject grammar** per part 1 §6.2 (`flb.fab.ev.<lane>.<part>`,
   `flb.fab.fact.<venue>`, `flb.fab.node.<node>`); typed constructors
   in `Subjects.ts`; subjects route, envelopes identify — no digest is
   parsed out of a subject anywhere.
6. **Refusals** per the house shape: tagged unions carrying kind,
   `sort` (`structural` | `absence`), law sentence, path, got/expected,
   `next`; nothing throws across any seam; only `absence` is
   retryable by the shipped policies.
7. **Round trip**: two processes exchange envelopes over a local
   pinned `nats-server v2.14.4` (R=1, file-backed temp dir); publisher
   sets the digest header; consumer constrained-decodes and re-derives.
   How the server binary is obtained is an executor DECISION to record
   (constraint: version exact, no cluster mode).
8. **The wall**: a generated envelope corpus (TS emitter; provenance
   line = generation command; regeneration byte-diff in the gate) is
   digest-checked by the Go side using `go/canonical` — the named
   oracle outside the TS implementation. TS ≡ Go by digest over every
   row.

## Gates (mechanical)

- `bun run gates` green with the package wired into
  `test:packages`; package `bun run test` green from its own directory.
- Cross-runtime wall green over the generated corpus; corpus
  regenerates byte-identically.
- Round-trip test green against the local server; the consumer's
  re-derived digest equals the publisher's header for every frame.
- Negative controls, each committed with its trace: (a) an
  excess-property frame refused with a structural refusal naming the
  law; (b) a planted wall mutant that digests the compressed transport
  form is killed by the wall; (c) a corpus row edited by hand fails the
  regeneration diff.
- No imports from `repos/`; no dependency beyond decision 2.

## Non-goals

Folds, anchors, KV, registers, lanes-as-consumers, sessions, MCP,
codegen. Later epics own them.

## Closing report extra

A short guided tour of the package for the operator — module by module,
what each is and why it is shaped that way, glossing every Effect idiom
used (the education rule applies: this scaffold is machinery the
operator will ratify extensions of).

Seats: Eng builds on `agent/<name>/<issue>`; Rev reviews the PR;
coordinator merges. DECISIONS log per house rule.

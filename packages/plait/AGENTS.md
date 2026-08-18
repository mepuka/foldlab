# packages/plait — agent contract

The slice-0 coordination-fabric spine. Read root `AGENTS.md` first; scoped laws:

- `Canonical.ts` delegates to `@foldlab/core/jcs`. There is one RFC 8785
  canonicalizer; never add or copy another.
- Envelope identity is SHA-256 over canonical, uncompressed bytes. Compression,
  framing, storage, and chunking are transport only and never move identity.
- Subjects route and envelopes identify. No code derives or parses a digest from
  a fabric subject.
- Every public Effect operation and Layer constructor carries only `Refusal`
  in its error channel. Refusals are `Schema.TaggedError` values; nothing
  throws across a package seam, and only `sort: "absence"` is retryable.
- NATS types remain under `src/internal/`. Public reads are `Stream`s and every
  connection, consumer, and message pump is owned by `Scope`.
- `fixtures/envelopes.ndjson` is generated only. Its provenance line is the
  generation command, and `bun run check:corpus` must regenerate byte-identically.
- The public-surface conformance assertion derives from the barrel namespaces,
  including Context service shapes and Layer constructors. Its planted
  `{ok}`-union, new-Effect-export, and service-class controls are a paired gate.
- Cells merge by join before every write. There is no last-writer-wins path, no
  ordering parameter, and no conflict callback; a lost CAS race re-reads and
  re-merges. A cell surface that takes a rewrite function instead of a delta is
  a finding.
- No watch surface ships on any KV-backed module until the watch probe suite
  lands on the substrate gate, and no absence is ever inferred from a watch.
- Verify-on-read happens at exactly one seam (`Resolved.resolve`). A store
  service that verifies its own answers cannot be tampered with by a control,
  so none does.
- Schema issues never cross a package seam. `internal/refusals` is the whole
  bridge and `Refusal.decodeRefusing` is its only public door; exporting a
  `SchemaIssue`-typed signature diverges the public-surface type-level walk.
- `ContextProgram` is declaration shapes only. Adding an assembly executor, a
  context value, or any F7 language belongs to the assembly slice, not here.
- Runtime dependencies are the workspace RFC 8785 seam, the catalog-pinned
  Effect release, and the five NATS packages pinned at 3.4.0. Add nothing else.

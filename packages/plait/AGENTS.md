# packages/plait — agent contract

The slice-0 coordination-fabric spine. Read root `AGENTS.md` first; scoped laws:

- `Canonical.ts` delegates to `@foldlab/core/jcs`. There is one RFC 8785
  canonicalizer; never add or copy another.
- Envelope identity is SHA-256 over canonical, uncompressed bytes. Compression,
  framing, storage, and chunking are transport only and never move identity.
- Subjects route and envelopes identify. No code derives or parses a digest from
  a fabric subject.
- Every public fallible function returns an `Effect` whose error type is
  `Refusal`. Refusals are `Schema.TaggedError` values; nothing throws across a
  package seam, and only `sort: "absence"` is retryable.
- NATS types remain under `src/internal/`. Public reads are `Stream`s and every
  connection, consumer, and message pump is owned by `Scope`.
- `fixtures/envelopes.ndjson` is generated only. Its provenance line is the
  generation command, and `bun run check:corpus` must regenerate byte-identically.
- The public-effect type inventory and its planted `{ok}`-union control are a
  paired gate. Update both only when the public API intentionally changes.
- Runtime dependencies are the workspace RFC 8785 seam, the catalog-pinned
  Effect release, and the five NATS packages pinned at 3.4.0. Add nothing else.

# packages/plait — agent contract

The slice-0 coordination-fabric spine. Read root `AGENTS.md` first; scoped laws:

- `Canonical.ts` delegates to `@foldlab/core/jcs`. There is one RFC 8785
  canonicalizer; never add or copy another.
- Envelope identity is SHA-256 over canonical, uncompressed bytes. Compression,
  framing, storage, and chunking are transport only and never move identity.
- Subjects route and envelopes identify. No code derives or parses a digest from
  a fabric subject. Each declared `(lane, partition)` owns one exact stream;
  its dense stream sequence is the successor position.
- Every public Effect operation and Layer constructor carries only `Refusal`
  in its error channel. Refusals are `Schema.TaggedError` values; nothing
  throws across a package seam, and only `sort: "absence"` is retryable.
- NATS types remain under `src/internal/`. Public reads are `Stream`s and every
  connection, consumer, and message pump is owned by `Scope`.
- The successor discipline protects; the anchor floor records. Raw arrivals
  enter the position buffer, application advances only through consecutive
  successors, and explicit ack follows the covering anchor CAS.
- A lost anchor revision CAS is a fatal detach. Do not add reread-and-continue,
  reset, rebuild, offset manipulation, or exactly-once vocabulary.
- `fixtures/envelopes.ndjson` is generated only. Its provenance line is the
  generation command, and `bun run check:corpus` must regenerate byte-identically.
- The public-surface conformance assertion derives from the barrel namespaces,
  including Context service shapes and Layer constructors. Its planted
  `{ok}`-union, new-Effect-export, and service-class controls are a paired gate.
- Runtime dependencies are the workspace RFC 8785 seam, the catalog-pinned
  Effect release, and the five NATS packages pinned at 3.4.0. Add nothing else.

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
- Cells merge by join before every write. There is no last-writer-wins path, no
  ordering parameter, and no conflict callback; a lost CAS race re-reads and
  re-merges. A cell surface that takes a rewrite function instead of a delta is
  a finding.
- One lattice write path exists: `internal/cas.ts`'s `casJoinLoop`. A second
  bounded re-merge loop written into an adapter is a finding, and so is a
  carrier that reaches around it. The three CAS disciplines are never unified —
  joins retry because idempotence discharges the ambiguity, registers reconcile
  by read-back against the one intended record because outcomes land at most
  once, and anchors never retry at all. Routing an anchor through either loop
  would smuggle its exclusivity assumption into a combinator a different law
  licenses.
- A local replica is a lower bound, never an oracle. Nothing derives absence,
  freshness, or durability from `CellReplica`; it is fed by polling, and a watch
  feed needs its own ruled ticket before it may feed anything.
- No watch surface ships on any KV-backed module without its own ruled ticket.
  Probe evidence licenses advisory use and never grants the license to ship —
  a landed suite discharges no fence by itself. Whatever ships is advisory:
  `KvWatchEntry.isUpdate` is not an initial/live boundary, and no absence is
  ever inferred from a watch.
- Verify-on-read for a *resolved reference* happens at exactly one seam
  (`Resolved.resolve`), and the two stores under it — `Catalog` and the
  catalog-internal `Payloads` seam — stay unverified so a lying layer can be
  supplied under them (T18). The *public* blob store (`Blob.ts`) is the one
  place verification lives inside the service: its control flips bytes on the
  substrate behind the API, so verified-get is testable without any unverified
  public read path. Adding a second verify door to `Catalog`/`Payloads`, or an
  unverified read to `Blob`, is a finding either way.
- The resolve memo decorates the verify door and only it. A cache on
  `Catalog.get` or the `Payloads` seam holds unverified bytes and is a finding;
  so is a cache key that carries an anchor, a petname, or anything else naming
  whatever is current — this keyspace is digests, which are immutable, which is
  the entire licence for never expiring a hit. A recorded failure is a finding
  twice over: absence is head-relative, and remembering it makes a retryable
  observation permanent.
- Public absence is an `AbsenceRefusal`, never `Option`. `Option.none` is
  invisible to `retryAbsence` and carries no head-relative vocabulary; the
  `Option` on the internal payload seam is plumbing and stays there.
- No ranged or partial blob read ships until the chunk-manifest identity law
  exists: a byte range cannot re-derive the whole-value digest, so a partial
  read cannot verify on read. `get` is whole-value on every backend.
- A blob backend ships only with the backend-agnostic conformance suite green,
  and with a planted control per law. The probe gate binds the object-store
  backend only — the filesystem backend's substrate is the OS filesystem and
  its wall is that suite; the NATS object store waits on its probe.
- Schema issues never cross a package seam. `internal/refusals` is the whole
  bridge and `Refusal.decodeRefusing` is its only public door; exporting a
  `SchemaIssue`-typed signature diverges the public-surface type-level walk.
- `ContextProgram` is declaration shapes only. Adding an assembly executor, a
  context value, or any F7 language belongs to the assembly slice, not here.
- `src/kernel/KernelTables.generated.ts` is generated only, from
  `fixtures/kernel-conformance.ndjson`, and `bun run check:kernel-tables` must
  regenerate it byte-identically. Never hand-edit a kind, a rank, a taught law,
  or a repair: the model emits them, and a hand-typed table is drift with a
  green gate. `test/fixtures/kernel-conformance.sample.ndjson` is the
  independently transcribed control the wall compares against, never a source.
- No admission door ships yet. `src/kernel/KernelDoor.ts` is the seam's type only; the
  reference door under `test/` exists so the conformance replay has a target
  and is not the thing to build on. A real door is checked by pointing
  `KernelConformance.test.ts` at it — the harness takes its target as a
  parameter, and its refuse-everything mutant is what makes the pass evidence.
  Conformance is agreement with the model's verdicts, never a runtime guarantee
  promoted out of a model theorem.
- Runtime dependencies are the workspace RFC 8785 seam, the catalog-pinned
  Effect release, and the five NATS packages pinned at 3.4.0. Add nothing else.

# packages/plait — agent contract

The slice-0 coordination-fabric spine. Read root `AGENTS.md` first.

## Where to look next

One hop per level. Root `AGENTS.md` carries the standing estate laws, this file
carries the package's, and each plane directory under `src/` carries a README
saying what that layer is, what is machine-generated in it, how to regenerate
that, and which wall proves it — then points one level deeper, down the plane
order, so that any descent lands on `src/kernel/` within three hops.

- [`src/truth/`](src/truth/README.md) — the vocabulary every sentence speaks
- [`src/kernel/`](src/kernel/README.md) — the language: corpus, door, programs,
  and wire grammar. Start here for the generated core and the model behind it
- [`src/planes/`](src/planes/README.md) — the state carriers, one seam per
  plane
- [`src/carriage/`](src/carriage/README.md) — hosts and transport clients
- [`src/surface/`](src/surface/README.md) — entry points
- [`src/internal/`](src/internal/README.md) — private adapters

Beside this file: [`CONTEXT.md`](CONTEXT.md) glosses the terms behind the seam,
[`README.md`](README.md) states each claim with its bounds,
[`DECISIONS.md`](DECISIONS.md) logs every decision the spec did not fix, and
[`QUICKSTART.md`](QUICKSTART.md) with
[`FOR-WORKING-AGENTS.md`](FOR-WORKING-AGENTS.md) are the outsider-facing pages.

## Scoped laws

- `Canonical.ts` delegates to `@foldlab/core/jcs`. There is one RFC 8785
  canonicalizer; never add or copy another.
- Envelope identity is SHA-256 over canonical, uncompressed bytes. Compression,
  framing, storage, and chunking are transport only and never move identity.
- The inline/blob threshold is pinned against a MEASURED `max_payload`, never a
  round number: `test/MaxPayloadSemantics.test.ts` measures the budget and the
  emit path's header cost at the pin, and the threshold is a stated quarter of
  it. Moving `INLINE_BODY_MAX_BYTES`, `MAX_PAYLOAD_BYTES`, or
  `EMIT_HEADER_BYTES` without re-running that measurement is a finding. The emit
  seam checks the live server against the pin and refuses
  `payload-substrate-shape`; that check ships with the lowered-`max_payload`
  server that makes it fail, and a shape check with no such control is not a
  wall.
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
- A path resolves from an explicitly named root digest. There is no current
  directory, no ambient root, and no relative escape: `at` takes the root as its
  first parameter, so a rootless walk is a compile error and not a validation
  (`negative-controls/Address.rootless.mutant.ts`), and `.` and `..` are refused
  names. Adding a root-defaulting overload, a session root, or a path-string
  parser is a finding.
- A lawful root is read AT AN ANCHOR and handed to the walk as data — KM-16's
  positive half, and the reason for every negative above. `Anchor.ts` owns that
  read: a checkpoint fact's `stateDigest` or `head`, or a digest a publication
  returned. The read is head-relative, so it belongs to the plane that owns
  anchors; a root obtained inside `Address.ts` would be resolving against
  whatever is current, which is the ambient input the fence exists to refuse.
- Addressing types trace to the corpus or wear a waiver, and the module header
  says which. `Petname` derives from the generated `KernelPetname`;
  `ambiguous-binding` is the model's spelling, walled against
  `fixtures/fabric-conformance.ndjson`; `Binding`, `Directory`, and the other
  three refusal kinds wear a Law 1 waiver citing DEV-796. Adding a fourth
  hand-written type here without one of those three answers is a finding.
- Addressing adds no store, service, layer, or cache. Every hop is
  `Resolved.resolve`, so verify-on-read is inherited rather than restated; a
  second fetch or verify path under `Address.ts` is a finding.
- A root digest names one immutable directory, so every addressing verdict under
  it is permanent: unbound and ambiguous are structural. The only absence on
  that walk is `resolve`'s own `cataloged-value-absent`, and minting an
  `AbsenceRefusal` for an unbound name is a finding — it would make `retryAbsence`
  spin against bytes that cannot change.
- A directory carries a binding SET, so one name bound to two digests is
  representable and `ambiguous-binding` refuses it. Nothing in a walk arbitrates:
  the model's sealed-at verdict reads the commitment register's evidence, and
  reading a seal here would be a second arbitration path beside `Register.ts`.
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
- A session is read-plane state and writes nothing. `Session` reads anchors and
  the states they name; it never commits an anchor, never emits, and never
  carries a revision on its values. A write verb on that seam is a finding, and
  so is a session field that reaches the substrate.
- The writ is judged in `Session`'s own functions, before any layer is reached,
  so a fixture service cannot drop it and a session cannot cache it. Moving that
  judgment into the adapter is a finding.
- The consumer seam refuses undeclared views on ITS surface and claims nothing
  about the package's other read paths. Writing that every outbound byte is a
  declared, writ-scoped image — in prose, a docstring, or a claim ledger — is an
  overclaim until the law is proved; this seam ships its shape, not its
  enforcement.
- `src/kernel/KernelTables.generated.ts` and
  `src/truth/RefusalKinds.generated.ts` are generated only, from
  `fixtures/kernel-conformance.ndjson` plus the reviewed runtime-refusal
  projection in `scripts/kernel-runtime-refusals.ts`, and
  `bun run check:kernel-tables` must regenerate both byte-identically. Never
  hand-edit a kind, a rank, a taught law, or a repair: the model emits its rows;
  runtime spellings absent from that corpus carry an explicit `DEV-804`
  staged-debt waiver in the generated ancestry.
  `test/fixtures/kernel-conformance.sample.ndjson` is the independently
  transcribed control the corpus wall compares against, never a source.
- The refusal vocabulary is emitted INTO `truth/`, never imported up from
  `kernel/`. `truth/` is the deepest plane and imports only itself; a generated
  artifact carries no import-direction debt because its ancestry is the
  generator, not an edge in the module graph. A truth module that reaches into
  `kernel/` for the vocabulary is a Law 4 finding, and so is a hand-written
  literal union standing beside the generated one.
- `check:refusal-vocabulary` compares three artifacts and never two views of
  one value: the runtime union read from the truth-plane module's source bytes,
  the refusal reasons read from the interchange fixture's bytes, and the
  reviewed staged-debt pin at `test/fixtures/refusal-staged-debt.pin.txt`. The
  pin is nothing's input — adding a spelling to the projection manifest and
  regenerating does not satisfy the wall, because the debt must also be written
  into the pin by hand. `check:refusal-control` plants a hand-minted kind into
  the union source and must fail for its committed reason.
- A refusal's taught payload is persisted evidence. `check:refusal-payloads`
  pins every `law`, `expected`, and `next` text under `src/` in
  `test/RefusalPayloads.taught.txt` and byte-compares it, so editing one
  minting site's teaching reddens the wall and shows the edit. Regenerate with
  `bun run generate:refusal-payloads`, and treat a moved text as a wire change
  wanting its own ruled ticket, never a rendering detail.
- `src/kernel/KernelDoor.ts` is the one shipping admission door. Its candidate,
  context, and intrinsic-act types derive from `KernelSchemas.generated.ts` and
  retain the model's `bigint` identity labels; runtime hex digests do not map
  them. CLI, `FabricClient`, and `CasDaemon` export that exact `admit` function,
  never a wrapper or private candidate validator. `KernelConformance.test.ts`
  replays the emitted verdicts against it; its refuse-everything mutant and
  host-identity control make the pass evidence. Conformance is agreement with the
  model's verdicts, never a runtime guarantee promoted out of a model theorem.
- Runtime dependencies are the workspace RFC 8785 seam, the catalog-pinned
  Effect release, and the five NATS packages pinned at 3.4.0. Add nothing else.

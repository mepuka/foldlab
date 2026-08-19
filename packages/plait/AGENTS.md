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

- **No tracking artifacts on any rendered surface; references are digests.**
  (Root law 10, operator-ruled 2026-08-19.) Nothing this package renders
  outward — generated doc comments, the prose page, tool schemas, refusal
  payloads, CLI output — carries a ticket id, a dev-tracking parenthetical, a
  script invocation, or a filesystem path. A plait item refers to another
  value by digest or derived digest, never by path; provenance on a rendered
  surface is the digest of its source. Ticket citations and waiver lines stay
  in the reviewed roster sources, pins, and DECISIONS — the generators do not
  project them.
- `Canonical.ts` delegates to `@foldlab/core/jcs`. There is one RFC 8785
  canonicalizer; never add or copy another. That is a wall now, not an
  exhortation: `check:one-canonicalizer` scans every module under `src/` for a
  retired twin's path, a retired twin's name, or the canonicalizer signature (a
  member sort beside a JSON serializer), and `check:one-canonicalizer-control`
  plants the committed twin at
  `negative-controls/OneCanonicalizer.private-twin.mutant.ts` into `src/truth/`,
  requires the scan to go red on both arms, and restores the tree. The private
  twins this package carried until DEV-804 slice C
  (`truth/CanonicalJson.ts`, `truth/SchemaCanonical.ts`) existed because the
  seam's number domain and the kernel corpus's disagreed; the operator ruling
  of 2026-08-18 (DEV-807) moved the estate number domain into the seam and
  removed the excuse.
- Envelope identity is SHA-256 over canonical, uncompressed bytes. Compression,
  framing, storage, and chunking are transport only and never move identity.
- **Verify-on-read verifies the FETCHED BYTES.** A store that holds bytes is
  admitted on `sha256(bytes) == D` over the exact octets BEFORE anything
  decodes them, and the value is then decoded from those verified bytes with
  the estate's fatal constrained decoder — never re-derived from a decoded
  value, which is the laundering door (a repairing decode admits bytes the
  digest refuses). Wall: `test/ResolvedByteIdentity.test.ts` with the raw
  bytes + digest as the oracle and its executed mutant. A store that holds
  values (the catalog) has no byte string to check and says so in place.
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
- **One connection carries one status pump, and the vocabulary it speaks is
  transcribed.** `internal/statuspump.ts` is the only consumer of a
  connection's status source and it attaches in `establishConnection`, so
  "built once as a fact source" is a construction rather than a convention; a
  second attach on one connection is a caller DEFECT and dies as one, never a
  refusal (the pin's source fans out, so the failure a second consumer causes
  is double-minting, not loss). The eleven event types and their payloads are
  transcribed in `internal/statusvocabulary.ts` as data with per-row
  provenance, in the pin's declaration order, all eleven, never a subset and
  never a hand-written union; seven are placed as transitions and four are
  readings within a state, and a reading is never a state and never feeds a
  state decision. A machine state is named by the transition that enters it, so
  no state carries a word the substrate never said; the position before any
  transition is `null`, which is the absence of a state and not one. The
  transition that re-attaches mints a successor through the session mint,
  naming its predecessor; the terminal transition lands the session-ended fact
  with the cause the pin resolved, and an empty cause is the pin's own report
  of an orderly teardown rather than a missing one. The pump reacts to nothing —
  the lame-duck fact is emitted here and honoured elsewhere. Wall:
  `check:status-vocabulary` byte-compares the table against the installed
  client's own declaration and holds totality, the reading/state split, the
  reachable absorbing state, and the no-per-event-branch scan over the pump's
  source; `check:status-vocabulary-control` plants one mutation per clause.
  Adding a hand-written state union, a per-event branch in the pump, a second
  consumer of a status source, or a landing path beside `sessionlanes.ts`'s one
  emit is a finding.
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
  `src/truth/RefusalKinds.generated.ts` are generated only, and no longer from
  here: the kernel model's own emitter projects them, from the corpus it mints
  plus the reviewed refusal roster it reads. Regenerate them with the emitter
  (`verify/unity`, which documents the two targets beside them) and commit the
  surfaces and the emitter's digest register together;
  `bun run check:kernel-surfaces` holds the committed bytes to that register,
  and byte-identical regeneration is walled where the emitter runs. Never
  hand-edit a kind, a rank, a taught law, or a repair: the model emits its rows;
  runtime spellings absent from that corpus carry an explicit `DEV-804`
  staged-debt waiver in the generated ancestry.
  `test/fixtures/kernel-conformance.sample.ndjson` is the independently
  transcribed control the corpus wall compares against, never a source.
- The refusal vocabulary is emitted INTO `truth/`, never imported up from
  `kernel/`. `truth/` is the deepest plane and imports only itself; a
  seam-tagged internal edge is tolerated where necessary, each edge pinned in
  `test/fixtures/truth-internal-edges.pin.txt`, and folding the material into
  `truth/` proper is preferred when a way exists. A generated artifact carries
  no import-direction debt because its ancestry is the generator, not an edge in
  the module graph. A truth module that reaches into `kernel/` for the
  vocabulary is a Law 4 finding, and so is a hand-written literal union standing
  beside the generated one.
- `check:refusal-vocabulary` compares three artifacts and never two views of
  one value: the runtime union read from the truth-plane module's source bytes,
  the refusal reasons read from the interchange fixture's bytes, and the
  reviewed staged-debt pin at `test/fixtures/refusal-staged-debt.pin.txt`. The
  pin is nothing's input — adding a spelling to the projection manifest and
  regenerating does not satisfy the wall, because the debt must also be written
  into the pin by hand. `check:refusal-control` plants a hand-minted kind into
  the union source and must fail for its committed reason.
- Every refusal kind carries its standing MEANING: one to two sentences saying
  what fact the kind names and what that implies, reviewed data in
  `scripts/kernel-runtime-refusals.ts` — the runtime spellings' meanings beside
  their roster rows, the model-emitted reasons' in the ledger below them,
  because the corpus has no field a meaning could ride in. A meaning is not a
  refusal's teaching: `law`, `expected`, and `next` speak at the moment of
  refusal about one presentation, and a meaning speaks about the kind, standing.
  The generators project every meaning into `KernelTables.generated.ts`,
  `RefusalKinds.generated.ts`, the plain-TypeScript surface, and the prose page,
  each as standing text, and `check:refusal-vocabulary` holds four clauses over
  those bytes: a kind with no meaning refuses, a meaning rendered behind a draft
  marker refuses, one name carries one meaning, and the page and the modules
  render the same sentence. The DEV-825 operator taste pass ratified the corpus
  on 2026-08-19, which INVERTED that second clause: the marker was required
  before and any claim of draftness is refused now — the two retired forms by
  name, and anything else opening the same way. Adding a kind still means adding
  its meaning, amending one is an ordinary reviewed diff, and moving a sentence
  reddens the model emitter's gate and `check:kernel-prose` until both are
  regenerated. `check:refusal-meaning-control` plants a meaningless kind, a
  marked meaning, and a paraphrased page, and must fail on all three.
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
- `check:kernel-door` is standing law 2's mechanical wall (DEV-763/796 stage 4).
  It reads source bytes, never values: the door's candidate, intrinsic-act, and
  admission-context bindings must name symbols the generated schema module
  emits, and no other module under `src/` may construct or declare an admission
  verdict, route `admit` through anything but the door's own imported function,
  declare a hand-written twin of a name the door's form owns, or reach one of
  those names without importing it from the door or the generator. The
  `*.generated.ts` projections are exempt — their bytes are the model's and are
  byte-gated elsewhere — and `test/` is outside the sweep so a control can spell
  a second door. A module that names a judgment route the door does not own is
  written into `test/fixtures/kernel-door-routes.pin.txt` with its ticket, by
  hand; the pin is nothing's input, and a row naming no live route reds the
  wall. `check:kernel-door-control` plants one second-door spelling per clause
  and must fail for its committed reasons. The wall states what can be SPELLED:
  runtime route identity is `KernelDoor.routes.test.ts`'s, and a route reached
  only through an object spread is that test's to hold, not this one's.
- `src/kernel/KernelIdentity.ts` is the ONE guarded trusted-base seam between a
  runtime content address and a model identity label (operator ruling A1,
  2026-08-19, board DEV-772). Its guard is `truth/Digest.ts`'s own schema run
  through `Refusal.decodeRefusing`: the width and alphabet are never restated
  here, because the corpus states no hex width at all — the generated
  `KernelDigest` says a real digest "stays in the trusted base" — so the runtime
  domain has exactly one statement and this seam inherits it. The refusal rides
  the error channel carrying its law and repair; a `throw` on this path is a
  finding, and so is a second reading of digest bytes as an unbounded natural
  anywhere under `src/`. `check:kernel-door` enforces all four: every
  conversion in the seam sits behind the guard, the seam never throws, every
  hex-prefixed `BigInt` site under `src/` is named in
  `test/fixtures/kernel-identity-sites.pin.txt`, and a pin row naming no live
  site reds the wall. `Lane.partition` is pinned there as routing, never
  identity — it reduces an already-branded `Digest` to a shard index that
  reaches no candidate. The map is injective on the guarded domain and is the
  trusted base's, never a theorem.
- **The engine speaks through the one door and carries only admitted
  sentences.** `carriage/Engine.ts` is the language-speaking service: every
  judgment routes through the imported `KernelDoor.admit` — never a wrapper —
  and a refused sentence performs no carriage, which
  `test/Engine.test.ts` holds with an out-of-engine recording carrier and an
  executed carry-before-judgment falsification. The engine's door context is
  a REPLICA in the cell-replica sense: seeded at layer build, grown only by
  the engine's own admitted declares, a lower bound and never an oracle; its
  pinned universe grows in lockstep, and a narrower per-writ discipline is
  the writ slice's. The engine holds no clock, schedule, retry, or queue —
  the daemon fence — and there is no fixture engine: judgment cannot be
  replaced, so a test configuration is the same layer over fixture carriers.
- **A program run completes each node from four provenances and no fifth**:
  declaration bytes, dataflow landings (a consumed local is its producer's
  landed identity label), supplies bound by node name (kinds, anchors,
  tokens, predicates — the slots the declaration form deliberately does not
  carry), and the engine's bindings (a join's strategy is the declared
  cell's merge algebra). A missing supply is refused by the DOOR with the
  model's own row; a shape no candidate slot carries refuses at
  `decodeRefusing`, the one parse boundary. The runtime never pre-judges: a
  run's refusals are the door's, taught, with the node named and prior steps
  kept. Trigger and spawn land nothing — the model interprets both as
  world-identity — and a fold lands its anchor's state label; the value-
  returning read canon stays on the session and fold seams. Wall: the run
  suite executes the corpus's own program vectors, label-mapped for the
  landing cases and byte-raw for the refusing ones.
- **Environments are directories at the ruled minimal surface.**
  `planes/Environment.ts` carries positioned provision facts, the
  greatest-position read, and the fold form the proven collapse equates with
  it; a genuine tie refuses `ambiguous-binding`, because a read never
  arbitrates — arbitration is the fenced register's. `fillFrom` hands the
  greatest-position valuation to the builder's one proven `fill`; no second
  substitution path exists. Wall: digest-seeded correspondence cases plus
  the corpus tie — filling the builder twin of the holey vector through a
  shadowed environment must reach the committed filled twin's exact bytes.
- **The MCP face serves the model's artifact, byte-walled at two homes.**
  `fixtures/tools.schema.json` is a byte-identical committed copy of the
  model gate's own tool-schema emission; `bun run check:kernel-tools` holds
  the two homes identical and `check:kernel-tools-control` executes the
  mutation that reds it. `surface/mcp.ts` serves those bytes: dynamic tools
  carry the raw schema verbatim to the wire, handlers route through the
  engine, a door refusal answers with exactly the artifact's four refusal
  fields, and a seam refusal answers with the estate refusal's own fields —
  the two registers never dress as each other. The wire-name mapping is
  hand-carried reviewed data under a Law 1 waiver naming the corpus's
  provably-absent wire-name group.
- **`Session.changes` is the unfold of `read`.** Every element is one
  anchored consumer step, the writ is judged on every element by
  construction, and pacing, batching, and debounce are the consumer's —
  never promised by the seam.
- **Algebra combinators stay in the closed set.** `Algebra.product`
  transports exactly the intersection of earned brands — the variety
  argument — and the suite CONFIRMS the transport in the wall rather than
  being skipped by it. `Fold.mapped` and `Fold.filtered` move the event side
  of the F4 bridge only: a filtered-out event contributes the algebra's own
  identity, so the rung survives because the algebra is untouched. No
  arbitration, finishing, or open combinator hook exists to call.
- **A read-side fold's arms derive from the union, and the closure is held by
  the compiler.** The folds over the refusal kinds and the envelope kinds take a
  mapped arm record over the generated union, so a kind added tomorrow is a key
  every existing caller is missing and a kind the union does not carry is a key
  no caller can spell. Their suites build every arm record from the union
  artifact — `StructuralRefusalKind.literals`, `EnvelopeKind.literals`, the
  accessor `ContextProgram.volatilityRank` already reads — and never from a
  written list: an enumeration that is listed drifts, and a closure suite that
  drifts reports totality it no longer has. A suite cannot state the other half,
  because a suite that derives its arms grows with the union and keeps passing on
  the day a kind arrives; that half is `check:matcher-control` in `test:types`,
  two arm-short folds that must fail to typecheck against committed traces, each
  mutant carrying a lawful twin so the compiler reports one error. The traces
  name the whole arm record, so growing the vocabulary costs one deliberate
  re-recording — which is the acknowledgement that every caller must now handle
  the new kind. A hand-enumerated arm record, a hand-written switch over kinds,
  or an optional arm is a finding.
- **Every closed union a consumer reads by hand carries a fold, and the pin's
  matcher is used exactly where the union is a union of tagged types.** The
  engine's write outcome and its run outcome are folded by `Match.tagsExhaustive`
  because they are unions of tagged object types; the refusal kinds are folded by
  a mapped arm record because they are one type whose field carries many
  literals, and the pin's discriminator matcher would narrow every arm to the
  empty type. Same discipline, two shapes, two spellings. A compile-time control
  is owed only where a union can GROW WITHOUT ANYONE TOUCHING THE FOLD — the
  corpus-projected vocabularies — because only there can a kind arrive in a
  regeneration that edits no call site. A hand-written union in the module that
  declares it needs no control: the compiler reports it at every call site in the
  same edit that grew it. Folding the generated `KernelVerdict` on a surface is a
  second-door spelling wearing a fold's clothes; a verdict fold is the door's to
  offer.
- **Equality of a decoded value IS equality of its digest, and that is walled.**
  The digest equivalences over decoded envelopes and over cell states replace a
  structural walk with one string compare, and `test/EqualCoherence.test.ts` is
  what licenses them: `Equal.equals(a.envelope, b.envelope)` iff
  `a.digest === b.digest`, over the generated corpus and over generated
  envelopes drawn from a pool the wall measures for collisions. Forward is
  canonicalization determinism; backward holds modulo SHA-256 collision
  resistance, which is stated as trusted base and is not proved anywhere here.
  The wall compares only decode-fresh values and demonstrates why: the pinned
  `Equal.equals` caches per object pair, so a value mutated after its first
  comparison keeps its stale answer. Plait values are decode-produced and
  treated as immutable; a comparison over a value something could have moved is
  a finding, and so is a claim that the backward direction is proved.
- **A read-side affordance carries its bounds on its own export, and arbitrates
  nothing.** The token order is meaningful within one register key and one
  backing-stream incarnation, and it licenses sorting and rendering, never
  "read the maximum and act" — arbitration is the register's act under its
  revision fence. A publish acknowledgement's duplicate bit is the commons
  stream's dedup window and an emission acknowledgement's is that
  `(lane, partition)` stream's; the two folds stay separate because the two
  acknowledgements answer different subscriptions, and neither bit is
  durability or absence. The cell equivalence is licensed by the canonical form
  the door already imposes, so extensional equivalence over raw observation
  arrays is not exported — `canonicalize` is the door, and a predicate
  comparing un-canonicalized arrays would rebuild it beside itself.
- **No canonical value crosses a public seam as a bare `string`.** Every
  canonical name is a branded sort — cell names, register work keys, holders,
  outcome values, lane handles, stream names, segment names — so a bare string
  offered at one of those seams is a compile error and two sorts of the same
  shape never compare. The brands add nominal identity to checks the seams
  already made; they moved no refusal's kind and no law text. The literal-token
  grammar those sorts share is stated ONCE, as `Subjects.TOKEN_PATTERN`, and a
  second regular expression stating that same one-token grammar anywhere under
  `src/` is a finding. The routing-subject families and the carrier-permission
  families are different grammars that merely share its character class — one
  is a composite with a fixed prefix, the other admits wildcards — and they
  stay their own anchored patterns rather than being composed out of this one.
  Each sort that teaches a refusal has ONE minting site, in the module whose
  concept it names — `Cell.cellName`, `Register.workKey`, `Lane.laneHandle` —
  and the adapter under that seam calls it rather than re-testing the grammar.
  Two sorts live one plane deeper than their concept because a kernel module
  spells them too: `Holder` in the wire grammar, which the envelope carries, and
  `CellName` beside the token grammar, which the context program's cell selector
  reads. Their concept modules re-export them, so a caller still reaches a sort
  where its concept lives, and neither placement is a second declaration. Wall:
  `check:sorts-control` in `test:types`, eight bare-string and cross-sort
  spellings that must fail to typecheck against a committed trace, each with a
  lawful twin beside it in the same file so the refusal is the spelling's and
  not the file's. What stays bare is bare on purpose and is listed in
  `DECISIONS.md`: bucket-name consts, closed literal unions, connection names
  (deployment configuration, outside meaning), and the operation names inside
  refusal paths (diagnostics, not identities). A brand over an ops label would
  dignify a deployment nickname into a sort.
- Runtime dependencies are the workspace RFC 8785 seam, the catalog-pinned
  Effect release, `@effect/platform-bun` at that same catalog pin, and the five
  NATS packages pinned at 3.4.0. Add nothing else. The platform package joined
  the list on 2026-08-19 (DEV-786) for exactly one reason, recorded in
  `DECISIONS.md` T0: the CLI surface is built on the official Effect CLI, which
  on the v4 line ships IN-TREE at `effect/unstable/cli` and so cost the list
  nothing — but its `Command.Environment` needs real `FileSystem`, `Path`,
  `Terminal`, `Stdio`, and `ChildProcessSpawner` services, and `effect` core
  ships only `layerNoop`/`layerTest` fakes of them. `BunServices.layer` is that
  provision. Do not add `@effect/cli`: on this release line it is a v3 package,
  and pulling it would be a second, older CLI beside the one already present.

# carriage — hosts and transport clients

Where the fabric is reached, not where anything is decided. `FabricClient` is
the public Effect service whose live layer owns a NATS connection in `Scope`
and whose fixture layer wears the same tag. `CasDaemon` is a service *shape*
and nothing more — no tag, no layer, not even a throwing stub — because a
placeholder service is how "not wired" becomes "wired wrong" three slices on.

`Engine` is the language-speaking service: a caller speaks a candidate
sentence, the imported kernel door judges it, and only an admitted sentence
reaches a carrier — declare to the catalog, emit to lanes, join to cells,
decide to registers, resolve through the one verify-on-read seam. Its door
context is a seeded replica grown by its own admitted declares (a lower
bound, never an oracle), its bindings are built by declaring — configuration
is declared sentences — and `run` executes a closed program declaration one
node at a time through that same door, stopping at the first taught refusal.
The engine decides nothing, schedules nothing, and stores nothing
authoritative; the package `AGENTS.md` carries its laws, and
`../../test/Engine.test.ts` is its wall.

`RunTrace` is the engine's execution log and a pure consumer of it: it runs a
program through `Engine`, projects the outcome into ONE canonical fact, and
lands that fact on a declared lane through the engine's own judged emit. The
split with the verdict stream is the flux/meaning law made concrete — the stream
is the live per-act story and is transport, the fact is the run as a value with
a digest, and there is exactly one fact per run rather than one per step. The
steps travel verbatim and every unbounded integer is written as its exact
decimal, because a JSON number rounds an identity into a different one. Its
vocabulary and route live one plane deeper in `../internal/runtraces.ts`, which
is what lets the read face serve the lane without reaching this plane at all.
Wall: `../../test/RunTrace.test.ts` executes the corpus's own run vectors over
fixtures with the vectors as the oracle, and `../../test/RunTraceWall.test.ts`
lands two traces on a real substrate and reads them back through the lane's own
declared schema.

Plane layering seats carriage above planes. The tree is narrower and wider than
that at once: carriage imports `kernel`, `truth`, and `internal`
(`FabricClient.ts:12`) and no plane module at all, while two modules beneath it
import back up — `../kernel/KernelProgram.ts` takes `CasDaemon`'s shape and
`../internal/nats.ts` takes `FabricClient`'s. Both are type-only; the layering
law carves out no exception, so both are open findings under its pending lint.

`FabricClient` also carries the fold over a publish acknowledgement. It is not
shared with the lane's, deliberately: the two answer different subscriptions,
and each `duplicate` bit names its own stream's dedup window — this one the
commons stream's.

`Engine` carries the folds over its two outcome unions: one judged write, which
either carried a sentence or holds the door's taught row, and one program run,
which landed, stopped at the door, or stopped at a node the completion could not
speak. The write fold is dual because its landing type is parametric — the
pipeable shape alone has nothing to infer the landing from — and the served face
folds all five of its judged writes through it. Neither gets a compile-time
control, and the rule is in the package `AGENTS.md`: a control is owed where a
union can grow without anyone touching the fold, which is the corpus-projected
vocabularies and not a union declared in the module beside it. The generated
`KernelVerdict` beside them stays unfolded here — that fold, if anyone wants it,
belongs to the door.

Nothing here is machine-generated, and both service shapes are hand-written
declarations of corpus concepts — staged debt under the first standing law.

Wall: `bun run test:fast` for the fixture layer's contract
(`../../test/FabricClient.test.ts`) and `bun run test:walls` for the live
transport suites against a local `nats-server`. `bun run check:public-effects`
holds the service's public signatures and its refusal channel still.

One level deeper, down the plane order: `../planes/README.md`, the seams these
clients carry; each module's `@module` header states its own fences.

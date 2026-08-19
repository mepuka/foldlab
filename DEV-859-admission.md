# DEV-859 — the admission test, and the closing report

Slice S6 of the estate-daemon spec: server options as declared data, and the
closed-channel refusal.

## The admission test

**1. Which algebraic expression does this surface name?**

Two sentences, both already in the spec's lawful list. *declare* — "let this
server-options value exist, under the name that is its own bytes, as a
configuration" — and *resolve* — "what value does options digest d denote?".
The closed-channel inventory is not a third sentence: it is the admission door's
predicate over a declared value, and the door is where every sentence already
passes. The citation is the fold table's own row *"what options does this run
under"*, which the spec prices as a resolve over an immutable value; the
incarnation fact that carries the digest is the `decide` the fence slice
already built, unchanged.

**2. Which generator emits its projection, and which wall proves the projection
matches?**

SKETCH, with the debt filed. The corpus emitter has no substrate-vocabulary
group, so both tables — the transcribed option table and the closed-channel
inventory — are hand-carried transcription wearing the estate's standing
A5-shape waiver, in the same words the substrate field roster and the status
vocabulary wear theirs. The owed group is named in both modules.

What holds them meanwhile is measured rather than asserted, and it is three
walls rather than one: the two languages' tables are byte-compared
(`daemon — options schema parity`); the pin those tables name is compared
against the module the wall's own binary links; and every row's site is opened
in the pinned vendor's own source and checked to declare the field the row
names. The last two are the oracles OUTSIDE both transcriptions — without them
the parity stage would certify consensus rather than correctness.

**3. Which door judges its inputs, and which refusals does it teach?**

One door: `AdmitServerOptions`, walked before the value is digested, before the
vendor's options struct is built, and before a server is constructed —
therefore before any listener could be bound. Nothing else in the package
constructs a server, so there is no second door.

Four reasons, each teaching a repair: `closed-channel` (the repair is the
inventory row's own, naming the closed inventory, saying the row is closed by
declaration rather than by accident, and naming the operator ruling that would
open it — because a new listener is a new authentication surface);
`undeclared-option` (an inventory row reading an option the value does not
carry — absence is not closure); `options-citation-unresolved`; and
`options-citation-mismatch`. A roster test walks all four and reddens on a
reason that teaches nothing; a second test refuses "remove the field" as a
repair, because removing the field would replace a declared closure with an
absence.

**4. Which rung does its read live at, and which carrier does that license?**

The options read is a RESOLVE over an immutable value — the fold table's own
row, carried at CAS, with the anchor policy "none: a digest read is never
stale". The greatest-position read over declared values is positional and is
the provision fold, ties refusing rather than picking. Nothing here reads a
clock, and nothing here claims liveness.

**5. Which layer does it live in, and does its import direction hold?**

The Go side is `daemon`, which already sits above `canonical`, `journal` and
`register` and imports only those. The spine side is one new internal module
seamed at `truth` — the vocabulary every sentence speaks — importing only
`truth/Canonical`, `truth/Digest` and `truth/Refusal`. It is not exported from
the package entry and is not a public surface. `check:layering` is green.

**6. Is every Effect idiom in place?**

On the spine side: the two digest functions return `Effect<Digest, Refusal>`
through the one canonicalizer and the one digest, with no side-door control
flow; the tables are data and their derived types are projections of the data
rather than hand-written unions beside it. The Go side has no Effect and
carries the estate's typed-refusal shape instead, transcribed from the
register's — the gap being that the Go side has no shared refusal package, so
the two declarations are held by their fields and by review rather than by a
wall.

## Closing report

**Result.** Server options are declared data end to end. Nineteen options —
every one the daemon depends on, including the eight admission channels it
depends on being shut — are transcribed into one table with the pinned
vendor's own names, the vendor's own declarations, and the source sites those
declarations occupy. The declared value carries a measured setting for every
row and the vendor's options struct is constructed from that value and from
nothing else; the one exception that used to be set behind the value's back —
signal suppression — is a declared row now. An eight-row closed-channel
inventory refuses at the one admission door before any server exists, each row
refusing on its own with reason, law and a repair that teaches. A running
incarnation cites the digest of the exact value it started under, and the
citation round-trips through a resolve rather than a recomputation. Both tables
exist on both sides of the language boundary and are byte-compared, with the
vendor itself as the oracle over both.

**Changed.**

- `go/daemon/options.go` — the declared value grows to the table's full row
  set; the vendor struct is constructed from it entirely; the greatest-position
  read's tie check compares canonical bytes.
- `go/daemon/serveroptions.go` (new) — the option table, the closed-channel
  inventory, the admission door, the content-addressed options store, and the
  citation check.
- `go/daemon/refusal.go` (new) — the daemon's typed refusal and its reason
  roster.
- `go/daemon/daemon.go` — admission runs first in `Acquire`; `AcquireUnder`
  exists so the refusal's refutation can be executed.
- `go/daemon/serveroptions_test.go` (new), `go/daemon/daemon_test.go` — the
  package-level walls for the roster, the repairs, the per-row refusal and the
  citation.
- `packages/plait/src/internal/serveroptions.ts` (new) — the same two tables and
  the same declared value on the spine, wearing the A5-shape waiver.
- `packages/plait/test/ServerOptions.test.ts`,
  `packages/plait/test/process/substrate-options-mint.ts` (new) — the spine's
  own tests and the parity minter.
- `go/cmd/optionswall/` (new) — the four wall arms.
- `scripts/gates.ts` — four named battery stages.
- `scripts/check-daemon-ports-file.ts` — the new files join the named
  daemon-backed suite roster.
- `packages/plait/DECISIONS.md` — the task's fourteen decisions.

**Verified.** Every check below was run and its exit code read unmasked.

| check | exit |
| --- | --- |
| `bun run gates` (full battery, all four new stages inside it) | 0 |
| `go test -count=1 ./...` in `go/` | 0 |
| `gofmt -l .` in `go/` | empty |
| `go vet ./...` in `go/` | 0 |
| `go run ./cmd/optionswall` | 0 |
| `go run ./cmd/optionswall --admission-control` | 0 |
| `go run ./cmd/optionswall --citation` | 0 |
| `go run ./cmd/optionswall --parity` | 0 |
| `bun test packages/plait` | 1 — see caveats |

**Caveats.**

1. **A pre-existing failure, reported rather than repaired.**
   `bun test packages/plait` invoked directly fails two of the three
   `PresenceWall` rows on this host — the stock-binary harness times out waiting
   for its ports file. The same two rows PASS under the package's own grouped
   runner, which is what `bun run gates` invokes, and they fail identically on
   the base commit with every change of this slice stashed. It is this host's
   flake in a suite this slice does not touch, and it is left red rather than
   investigated.
2. **A declined inventory row, named.** The monitoring HTTP port is transcribed
   at its measured setting and is deliberately NOT an inventory row. Its value
   is a priced grill row belonging to the operator, and refusing a non-zero
   value there would be this slice ruling a row that was explicitly left
   priced. The HTTPS monitoring listener is a separate row and IS in the
   inventory, because nothing about it was ever priced. Every other row the
   ticket named — WebSocket, MQTT, cluster, gateway, leafnode listener,
   leafnode remotes, HTTPS monitoring, profiling — is covered.
3. **Values transcribed, never ruled.** No priced value moved: the sync
   interval and sync-always, the log suppression, the server name, and the
   monitoring HTTP port are all carried at what is measured. The wall's own
   revision from V1 to V2 moves the listen port, which is a wall-local
   coordinate rather than an estate row.
4. **New Go code where no package covered the need**, both named in the
   decisions log: the daemon's typed refusal (the Go side has no shared refusal
   package; the register's is package-scoped) and the content-addressed options
   store (the Go side has no CAS package, and the citation needs a resolve
   rather than a recomputation). Everything else is adopted — the canonicalizer,
   the digest, the lanes, the fence, and the incarnation fact machinery.
5. **The flush interval crosses the boundary as the daemon's own rendering.**
   The spine carries the rendered string rather than deriving one, so the parity
   comparison over that field compares what both sides declared and not two
   independent renderings of one duration.
6. **The tables are still hand-carried.** Both wear the A5-shape waiver naming
   the owed substrate-vocabulary emitter group. The three walls above are what
   stands in until the emitter mints them.
7. **The daemon-backed suite roster grew.** The new daemon and wall files joined
   the named roster in `scripts/check-daemon-ports-file.ts`, which extends that
   claim to them deliberately rather than letting them inherit it silently.

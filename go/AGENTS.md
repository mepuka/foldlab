# go/ — agent contract (substrate)

Slimmed 2026-08-15 to the focus substrate, then extended by DEV-711 with a
fresh `register/` twin and `cmd/registerwall/`, and by the kernel-model slice
with the conformance consumer `kmconform/`, its generator `cmd/kmgen/`, and
the brand lint `brandlint/` with `cmd/brandlint/`, and by the estate-daemon
slices with `daemon/`, `cmd/daemonwall/`, `cmd/incarnationwall/`,
`cmd/teardownwall/`, `cmd/optionswall/` and `cmd/wirewall/`: `canonical/`, `journal/`,
`register/`, `kmconform/`, `brandlint/`, `daemon/`, and the commands. The
stream/transform hot path, the archived effector, the
gauntlet lanes, and their commands live at tag
`archive/pre-estate-focus`. Read root `AGENTS.md` first; scoped laws:

- Stdlib + the pinned nats libraries only; `gofmt -l .` prints nothing;
  `go vet ./...` and `go test -count=1 ./...` green before completion.
  `-count=1` is required, not tidy: `canonical/` reads the root
  `fixtures/**` oracles, `journal/` reads
  `proto/wire/fixtures/chains.json`, and `kmconform/` plus `cmd/kmgen/`
  read `packages/plait/fixtures/kernel-conformance.ndjson` — all outside
  this module, and Go's
  test cache cannot see a mutation in a file it cannot attribute to the
  module root — `go test ./...` prints `ok (cached)` over a mutated
  oracle. Measured on the first two (`docs/FREEZING.md`).
- `canonical/` is RFC 8785: identity is of canonical uncompressed bytes
  (ADR-0002); never fingerprint a transport form. The frozen oracle is
  `fixtures/golden-conformance.json`; the cross-language referee rows
  are `fixtures/jcs-rfc8785.json`.
- `journal/` is CAS-append, verify-on-read; the shape gate refusing
  imports is the AUTHORITY rule (ADR-0009) — do not weaken it to admit
  mirrors; replicas are a distinct declared role.
- `cmd/jcsprobe/` is the Go side of the JCS differential wall,
  spawned as a persistent process by `packages/core/test/jcsProbe.ts`.
  Its line protocol is part of the wall; a change to it is a change to
  the wall.
- `register/` is fresh code, not restored `go/effector`. It has exactly the
  five F5 actions and no watch surface; `cmd/registerwall/` exists only for the
  heterogeneous hard-kill/steal/zombie schedule. Its INCARNATION PIN is
  implemented, not deferred: `Open` records the backing stream's creation stamp
  and every action re-asserts it before its own law checks, so a token minted
  under a destroyed bucket refuses `incarnation-mismatch` rather than landing on
  the reborn one. `OpenUnpinned` exists for the pin's committed refutation and
  for nothing else — no shipped consumer opens it, and the wall that does says
  so in its own output. Every refusal the package mints carries a repair, and
  `RefusalKinds` is the roster the totality test walks; a kind added without a
  repair row reddens.
- `kmconform/` is the kernel model's conformance corpus, consumed. Its
  serialization is ESTATE CANONICAL JSON — RFC 8785 with one deviation, an
  unbounded non-negative-integer number domain — and it is deliberately not
  `canonical/`: that package is the substrate's chain identity and its
  numbers are binary64 by the spec it implements, so sharing one encoder
  would mean either rounding a kernel Nat or breaking a frozen digest wall.
  The BOTH-WAYS LAW binds it: parse then re-emit of the whole corpus is
  byte-identical, every `canon` record's value canonicalizes to its `bytes`,
  and every `program` record's declaration canonicalizes to its `bytes`.
  `kmconform/tables_generated.go` is written only by
  `go run ./cmd/kmgen`; its regeneration gate lives in `cmd/kmgen/`, and a
  drift there is a FINDING to report, not a file to overwrite
  (`docs/FREEZING.md`).
- The `program` group is the ninth, added under the format's ADD-ONLY rule:
  appended after every existing group, one new counts key, no format bump.
  Its laws are in `kmconform/program.go` — nodes newest-first, the edge set
  equal to exactly the consumptions the local argrefs imply, holes ascending,
  and args keyed by the generator's own field names read out of the corpus's
  `Act` record rather than retyped. Never pin the corpus line count as a
  literal: validate it as `1 + sum(header.counts)`, which is what let the
  ninth group land without touching an arithmetic constant.
- `brandlint/` closes the two brand leaks Go leaves open: a conversion
  between distinct brand types, and a comparison against a non-zero untyped
  constant. Brands are DECLARED by the `//foldlab:brand` directive that
  `cmd/kmgen` emits, never guessed from a name. It is stdlib-only by the law
  above — `golang.org/x/tools/go/analysis` is not in the standard library —
  so it keeps that package's SHAPE without its dependency. It runs inside
  `go test`, and its two arms (`brandlint/testdata/{clean,leaky}`) are the
  control pair: a lint with no failing case proves nothing.
- `daemon/` is the estate's substrate held as a scoped process value: the
  declared server-options value, the pinned vendor's own lifecycle verbs, the
  in-process client zero, readiness observations onto a journal lane, the Go
  side of the substrate-session fold, and — since the supervisor slice — the
  incarnation fence and the lifecycle facts. It speaks its `decide` at the
  register package and holds no register of its own; a local "only one runs"
  check here would still be the unfenced act the fence exists to refuse. Its
  session fold AND its incarnation vocabulary are TRANSCRIPTIONS of the
  TypeScript spine's, never twins: the spine's declarations are the reference,
  and a divergence a wall exposes is a defect here, never a reason to move the
  reference. The hermetic no-socket posture is held open by its own test and is
  not to be removed.
  Three things in this package are load-bearing refusals rather than
  conveniences. The retirement-cause roster has exactly two declared estate
  values and NO row a crash could enter under, which is what makes forging a
  retirement on a dead incarnation's behalf unsayable. The standing vocabulary
  has no value meaning live, running, or healthy — an unretired incarnation
  reads as established forever, and adding a third answer would be the
  construction failing. And the declared server-options value refuses an unset
  server name and an unset sync interval, because an option nobody declared is
  an option the estate is running under unknowingly.
- `cmd/incarnationwall/` and `cmd/teardownwall/` are the supervisor slice's
  walls, wired into the battery as five named stages. The register wall races N
  supervisors for R successive chain positions with one racer out of process,
  and measures the losers' abstention from the FILESYSTEM — every racer writes a
  witness before it constructs a server — rather than from how the code reads.
  Its last round is ORDERED on purpose so the fence is measured refusing the
  near side too, and it says so in its own output; the bias history is in
  DECISIONS. The pin control and the consumer control are committed refutations
  and both are executed both ways. The teardown wall runs three teardowns as
  three processes and kills a whole process for the crash arm, because an
  in-process shutdown is not a process crash.
- `daemon/wirevocabulary.go` is the NORMATIVE home of the whole surface the
  estate speaks to its substrate: five transcribed tables — protocol verbs, the
  JetStream API and key-value subject surface, the system-account event
  subjects, the client status events, and the substrate's lifecycle surface. It
  is the one exception to the "transcription of the spine's" rule above,
  because it points the other way: the spine's table is EMITTED from this one's
  canonical rendering and reads no vendor source of its own. A second reading
  there would be a second transcription, and two transcriptions sharing a
  mistake agree perfectly.
  Every row carries the shape its word takes, a provenance pin — vendor
  package, version, and the sha256 of the exact source region — its place under
  the three wire shapes, and, where it is chatter, what it may accelerate and
  what it may never decide. The region's coordinates ride beside the row as the
  wall's oracle input and never reach the rendering. The digests are DERIVED
  from the installed sources into `daemon/wirevocabularydigests.go` and
  committed; the rendering is committed beside them; a fresh emission diffs
  against both. Each group states its closure rule, so completeness is
  checkable; a row this posture never reaches is carried and marked
  declared-but-unused, because omission is how a table starts lying. Adding a
  wire word the pinned vendor surface does not carry is a finding — such a word
  may enter only as a declared estate value under its own digest.
- `cmd/wirewall/` is that vocabulary's wall, wired into the battery as two
  named stages. Five arms, each failing on its own named reason: byte parity
  across the language boundary and against the committed artifacts; every row's
  provenance digest re-derived from the pinned vendor source AS INSTALLED, where
  a missing pinned source FAILS and never skips; a declared row census against
  an independently derived one; per-row closure; and a sweep of the estate's own
  sources for wire words written as bare literals outside the transcription
  modules. It spawns a TypeScript process for the parity arm, so it needs the
  root install warm. `--controls` is the committed refutation set: four planted
  defects, each of which must refute on the arm it was planted against.
  The sweep's exceptions are declared lines with stated reasons and an exception
  that stops matching anything fails the arm; re-sourcing a consumer to spell a
  wire word again, or adding a silent skip to that list, is a finding.
- `cmd/daemonwall/` is that transcription's wall — the carriage-invariance
  differential, run bare and its numbers printed: one connection folded from
  two carriages in one language, one connection folded from two carriages
  across two languages, and the committed control that mutates one field in
  one group and must fail. It is wired into the battery as three named stages
  and it spawns a TypeScript process, so it is the one command in this module
  that needs the root install warm. The claim it measures is a CANDIDATE
  stated only; the command executes a runtime differential at a bound and
  prints the bound with the result.

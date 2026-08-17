# The review-watch log (2026-08-13)

Moved verbatim out of `README.md` on 2026-08-17 when the root README
was re-centered on Plait. Nothing below is edited: it is the coordinator
seat's continuous-review log over the 2026-08-13 parallel build, newest
first, with every finding linked to its issue. Most of the surfaces it
reports on were archived on 2026-08-15 at tag
`archive/pre-estate-focus`; the explanations still hold, and the
findings are still readable evidence of how this repository catches its
own defects.

Current claims and their bounds live in
[VERIFICATION.md](../VERIFICATION.md), not here.

---

## The live watch

A coordinator seat runs continuous review over the parallel build —
monitoring lanes, bug-bash lanes, and first-consumer dogfooding — and
this log gets the results as they land. Newest first. Every finding
links to its issue; every claim there carries executed evidence.

**2026-08-13 (late) — the flywheel measured, licensed, and told.** A
dogfood lane drove the concierge as a **true stdio MCP client** — 21
JSON-RPC messages captured verbatim
(`demo/mcp-concierge-session.md`, on review branch
`worktree-agent-ac12a6acee3504305` pending merge): **11 tool calls from first intent
to a certified, content-addressed type** (clean path: 7), 1–6 ms per
call. The first refusal is the best evidence in the transcript: asked
for "a record type," the model wrote `"k":"record"` — the human's own
word leaking into structure — and repaired it in one round-trip from
`expected` alone. Identity-is-content proven twice live (identical
resubmit and reordered union both converge to one digest). Findings
filed: every tool mislabeled `destructiveHint:true` including pure
reads ([#40](https://github.com/mepuka/foldlab/issues/40)), and
`unknown-ref` is the one refusal that doesn't teach its own repair
([#41](https://github.com/mepuka/foldlab/issues/41)), plus live
confirmation on [#17](https://github.com/mepuka/foldlab/issues/17)
that the missing outputSchema is one mapping away from data the
daemon already serves. The repo is now licensed
**Apache-2.0** with NOTICE — foldlab is created and directed by
[Mepuka Kessy](https://github.com/mepuka) — and the story went public:
[the concierge flywheel, on mepuka.com](https://mepuka.com/blog/foldlab-concierge-flywheel).

### The five structures, and why they keep showing up

Everything in this repository — and every finding below — is built from
five data structures you already use, wearing house names. Knowing the
five makes every entry in this log readable.

1. **The append-only log** (house: *the journal*). Events, in order,
   never edited — the same shape as a git history or a Kafka topic.
   Every question in the system starts here, because "what happened,
   in order" is the one fact everything else can be recomputed from.

2. **The reducer** (house: *the meaning fold*). Run `Array.reduce`
   over the log and you get current state — exactly what every Redux
   store and every `Stream.runFold` does. Fold the same events, get
   the same state, every time.

3. **The hash chain** (house: *the identity fold*, its result *the
   chain head*). Feed the same events through a running SHA-256
   instead — the way each git commit hashes its parent — and you get
   a 32-byte name for *exactly this history*. Two logs can reduce to
   the same state yet have different heads; the repo's favorite
   sentence, "the chain remembers what the fold forgives," is just
   that observation. State tells you where you are; the head tells
   you every step of how you got there.

4. **The content-addressed store** (house: *the catalog*, *the fold
   cache*). Name things by the hash of what they are — git objects,
   the Nix store, a CDN etag. Entries are immutable, so there is
   nothing to invalidate, ever: if the name matches, the content is
   the content. Caching, deduplication, and "have we seen this
   before?" all collapse into one lookup.

5. **The version-checked register** (house: *the effector*). A
   compare-and-swap slot with a monotonically increasing token — the
   optimistic-locking pattern of every database version column, plus
   the fencing tokens distributed-systems books recommend. It is the
   *one* place in the system where writers coordinate. Everything
   else merges freely. (The standalone Go register is archived at
   `archive/pre-estate-focus`; protod carries the pattern at session
   close.)

Why do the same five keep arising, here and everywhere else? Because
they are the minimal answers to the only five questions a distributed
system ever asks: *what happened?* (the log), *what does it mean?*
(the reducer), *is it the same?* (the hash), *have we done this
before?* (the store), *who decides?* (the register). Any system that
answers those questions honestly reinvents these shapes — git, Kafka,
Redis, Nix, and every event-sourced app each hold two or three of
them. This repo's bet is simply to hold **all five under one
discipline**: everything is canonical bytes, so everything has a
digest; everything with a digest can be cached, compared, federated,
and replayed; and the mathematics of folds (a tagged union has
exactly *one* structure-respecting fold) turns those habits into
guarantees. Same input, same bytes, same hash — and anything derived
that way is safe to share between two languages, two machines, or
two strangers, because "do we agree?" becomes "do the digests
match?", which is decidable.

That unification is also why the findings below cluster the way they
do. Almost every bug this watch has caught is one of the five
structures betraying its principle at an edge: a hash built from
bytes that were quietly *repaired* rather than refused (a name that
lies), a reducer with two adjacent error dialects (a fold that
answers two ways), a register bucket that deletes the history a
watcher was owed (a log that forgot), a verifier that checks a bundle
against itself (a store trusting its own label). The principles are
common; the discipline of holding them *simultaneously, at every
edge, in two languages* is the actual project.

**2026-08-13 (night) — the docs lanes converge, and the proof demos
itself.** The PC side merged the four design dossiers onto main
(closing the wave-2 hazard
[#30 H1](https://github.com/mepuka/foldlab/issues/30)) and landed
`docs/research/2026-08-14-tangible-examples.md`: the five concepts as
worked examples, calibrated three ways (Effect developer, infra
engineer, skeptical auditor), every output executed rather than
narrated. The Terraform framing earns its keep — *"two streams can
have identical `terraform show` output and different `git log`;
foldlab gives you both digests so you can tell which kind of 'same'
you have"* is the best one-sentence account of the two folds to date.
And the review produced its own evidence: the committed
`packages/core/examples/tour.ts` was written and executed on Windows;
the Mac coordinator re-ran it during review and got **byte-identical
digests** — the cross-platform determinism claim demonstrating itself
inside the review of its own documentation.

**2026-08-13 (evening) — the bug bash reports: five lanes, one day.**
The Go concurrency lane proved the "flake" (#15) is a real eviction
race — the register bucket keeps one message per subject, so writing
the outcome deletes the claim, and a watcher racing that window waits
forever for a transition that no longer exists (causal control:
History=1 loses 2/250, History=10 loses 0/250). It also found the
scariest bug of the day: `Journal.Read` adopts an unverified
caller-supplied cursor, so a prior *read* can poison the next append's
chain link — unrepairably, in a DenyDelete stream
([#34](https://github.com/mepuka/foldlab/issues/34)). The semantics
lane confirmed twelve twin/digest findings — headline: protod decodes
request bodies with plain `encoding/json`, so distinct submissions can
derive one catalog digest
([#36](https://github.com/mepuka/foldlab/issues/36)) — and probed the
gauntlet verifiers adversarially: RG-A held strong; R2 accepted a
bundle whose corpus literally reads "FAKE problem…"
([#37](https://github.com/mepuka/foldlab/issues/37)). Its deliverable
is a ready-to-freeze wall-corpus row list
([#38](https://github.com/mepuka/foldlab/issues/38)). The
anti-tunnel-vision sweep filed the wave-2 dispatch hazards
([#30](https://github.com/mepuka/foldlab/issues/30)), the
dual-canonicalizer divergence
([#31](https://github.com/mepuka/foldlab/issues/31)), the
negative-controls-in-no-gate gap
([#32](https://github.com/mepuka/foldlab/issues/32)), and a 10-item
advisory digest ([#33](https://github.com/mepuka/foldlab/issues/33)).
The decision-preparedness scout ranked twenty decisions the build
order will force, twelve of them this-week class
([#35](https://github.com/mepuka/foldlab/issues/35)) — top regret
forecast: the refusal corpus is being born next week with three
unratified choices. Good news verified along the way: task 24's four
reply mutants each fire exactly once and are caught; the per-test
in-process NATS pattern is why the suite has no shared-state flakes;
zero frozen digests moved through all of it.

**2026-08-13 — foundations audit at `074947f`: INTACT, with one wall
red and invisible.** Zero frozen digests moved across 82 commits of
two-machine parallel landing — mechanically proven (no removed hex
constants in the diff walk; `streamfix` regenerates the fixture
byte-identically). But the wasm wall auto-skips on fresh checkouts
(`describe.if(built)` + gitignored `dist/`) and is **failing today**
when built: exactly 27 Unicode scalars diverge TS vs Go, because
`toUpperCase` follows the JS engine's Unicode 16 tables while Go ships
15.0.0 — two external tables, neither pinned, guarding a digest path
([#27](https://github.com/mepuka/foldlab/issues/27)). Ledger/doc drift
from the flurry consolidated in
[#28](https://github.com/mepuka/foldlab/issues/28).

**2026-08-13 — first-consumer dogfood of the fresh KV surface.** The
parallel-replay demo works in a 70-line consumer script: sequential ≡
split-and-combine ≡ enriched-semilattice, one digest; swapping the
halves breaks the order-sensitive route (by design) and commutes on
the semilattice route (by law). Two catches filed from the same
session: `emptyKV` had exported one shared mutable `Map` — a consumer
mutation could poison every later fold in the process
([#25](https://github.com/mepuka/foldlab/issues/25)) — and the
adjacent-file refusal-channel split (`applyKV` returns an Effect,
`foldSeqKV` a union) executes as a false "refused" under an
untypechecked consumer ([#26](https://github.com/mepuka/foldlab/issues/26)).

**2026-08-13 — the KV combine, proven and merged.** The briefed goal
(one operation, homomorphic AND commutative) was internally
contradictory — together those force order-insensitivity, and
last-write-wins is order-sensitive by construction. Split instead:
`combineKV` (associative segment recombination — every split of the
frozen corpus recombines to the frozen digest: the parallel-replay
license) and `combineSeqKV` (true join-semilattice on the enriched
carrier, projection reproducing the frozen digest byte-for-byte). The
tie-break rule was decided by the frozen corpus, not taste: `(seq,
stream)` reproduces the pinned digest; the other order provably
elects a different winner. Generated commutativity/idempotence laws
landed with a discriminating negative control
([#20](https://github.com/mepuka/foldlab/issues/20) delivered), and
the suspected dense/sparse merge divergence was refuted by a deciding
test — which surfaced a real cross-language finding instead: Go's
duplicate refusal blames a map-order-random source, TS blames
deterministically ([#21](https://github.com/mepuka/foldlab/issues/21)).

**2026-08-13 — the review cycle in issues.** The Rosetta pass
(vocabulary bridge to the common Effect knower, corrected twice by
its own audit lanes: [#14](https://github.com/mepuka/foldlab/issues/14)),
the MCP pin conformance findings
([#16](https://github.com/mepuka/foldlab/issues/16),
[#17](https://github.com/mepuka/foldlab/issues/17)), the refusal-corpus
sort split ([#18](https://github.com/mepuka/foldlab/issues/18)), the
frontier finding whose premise was then properly refuted by a deeper
lane and converted to a tripwire
([#19](https://github.com/mepuka/foldlab/issues/19)), and the
semilattice law gap ([#20](https://github.com/mepuka/foldlab/issues/20)).


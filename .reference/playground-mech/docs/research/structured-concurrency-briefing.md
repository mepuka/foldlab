# Structured concurrency: the theory briefing for OP-5 and the Observatory

Coordinator-authored orientation. Not normative — a map of the literature
with the specific load each result can bear for us. Cite these, verify
against them, and record where reality diverges.

## 1. What structured concurrency IS, formally

The discipline (Sústrik's libdill; N.J. Smith's "Notes on structured
concurrency, or: Go statement considered harmful", 2018; Kotlin coroutine
scopes; Effect's fiber scopes): every concurrent child's lifetime is bounded
by a syntactic/dynamic scope; errors propagate up, cancellation propagates
down. The consequence that matters to us is SHAPE: at any instant the
computation is a TREE, and a completed execution's happens-before order is a
**series-parallel partial order** (sp-pomset). This is not a metaphor — it
is a theorem-shaped fact:

> **The sp-decomposition anchor.** Series-parallel posets are exactly the
> N-free posets (Valdes-Tarjan-Lawler 1982), and every sp-poset has a
> CANONICAL decomposition tree. Ergo: an execution produced by structured
> concurrency combinators (seq, par/zip, forEach, scoped fork-join) has a
> canonical tree address for every operation occurrence — an address that
> depends only on program structure, NEVER on the schedule.

That is OP-5's target handed to us by a 1982 paper: **path = canonical
address in the sp-decomposition tree.** The open work is making Effect's
runtime or combinators actually produce those addresses, and handling the
two constructs that break sp-structure (below).

## 2. The determinism theorems worth standing on

- **Kahn Process Networks (Kahn 1974).** Deterministic processes over
  blocking FIFO channels compute a unique result independent of scheduling.
  The archetype of every "schedule independence" claim, ours included: our
  §8.2 memo-confluence is KPN-flavored (grow-only per-key facts play the
  role of monotone channel histories). The Observatory's multi-journal
  aggregation IS a Kahn network: verified chain reads are the blocking
  FIFOs; a decider fold is the deterministic process.
- **Bernstein conditions / commutativity.** Disjoint read/write sets ⇒
  reordering-safe. Our disjoint-opId-space requirement in §8.2 is exactly
  this, one level up.
- **Concurrent Revisions (Burckhardt-Baldassin-Leijen, OOPSLA 2010).**
  Fork-join with deterministic merge functions; their determinacy proof
  over "revision diagrams" (which are sp-shaped) is the closest published
  proof-shape to what an OP-5 stability theorem would look like.
- **CALM (Hellerstein/Alvaro; Ameloot et al.).** Monotone ⇒
  coordination-free. Our memo map is monotone; position allocation is not.
  The Observatory aggregate should be DESIGNED monotone so it needs no
  coordination — that is a theory-informed engineering choice, not taste.

## 3. The static-structure ladder (why the applicative fragment is special)

- **Free monad** (what §5 models): sequencing; structure unfolds
  data-dependently; you cannot know the shape without running.
- **Free applicative** (Capriotti-Kaposi 2014): parallel branches with
  STATIC shape — the whole branch structure is inspectable before running.
  Haxl (Marlow et al., ICFP 2014, "There is no fork") exploits exactly this
  for automatic, deterministic parallelism.
- **Selective applicative functors** (Mokhov et al., ICFP 2019): static
  shape plus data-dependent CHOICE among statically known branches.

Load-bearing consequence: **in the applicative/selective fragment,
positional naming is trivially stable** (the shape is a value). Naming only
gets hard where monadic bind makes the tree dynamic — and in OUR replay
setting, dynamic is still deterministic *given recorded outcomes* (SPEC
5.5): the tree unfolds identically on replay because every branching input
is a recorded fact. So the naming induction is: tree-prefix order on the
sp-decomposition; assuming all earlier ops' outcomes recorded, the next
layer's shape — and hence its addresses — is determined. The two genuine
breakers:

1. **First-completion (race).** Not sp-composable; the completion order is
  scheduler-chosen. Already ruled (SPEC 5.9/A4): a race is covered only
  when its WINNER is a recorded outcome — i.e., race is an `Op`, not a
  combinator. The naming question is then only about naming the branches,
  which is positional again.
2. **Unscoped/leaked forks** (fork-without-join, callback spawns). Outside
  structured concurrency by definition; outside the proved fragment. Name
  the exclusion precisely rather than fighting it.

## 4. The two attack angles (forks: pick ONE each, declare it first)

**Angle A — static/combinator (the free-applicative route).** Build durable
combinators (`dseq`/`dpar`/`dforEach`/`drace`/`dchoice`) that inject
sp-tree addresses positionally at composition time. The body writes
ordinary-looking Effect code through these combinators; no hand-written
names anywhere. Theory to lean on: sp-decomposition canonicity, free
applicative/selective for the static shape, Concurrent Revisions for the
proof shape. Deliverables: stability under refactor-preserving-structure;
refusal (valid(F,P')-style) when structure CHANGES; the exact grammar of
the covered fragment.

**Angle B — dynamic/runtime (the fiber-tree route).** Derive addresses from
Effect's own runtime structure: a path FiberRef (or equivalent) carrying
the current sp-address; fork sites assign child ordinals by DETERMINISTIC
BIRTH ORDER — defensible because the parent's spine is deterministic given
the memo (5.5), so fork sites execute in a reproducible order even though
completion order is not reproducible. Bodies keep using plain
`Effect.forEach`/`Effect.race`. Hazards to probe honestly: interruption
timing, race losers starting before losing, `Effect.all` internal
batching, whether Effect exposes enough of the fiber tree without patching
internals. This angle can FAIL — a precise failure characterization (which
combinators leak schedule into birth order) is a first-class result.

Both angles share the adversarial obligations: (i) a structurally identical
body with renamed variables/functions replays cleanly against an existing
journal; (ii) a structurally CHANGED body (inserted step, reordered
branches) is REFUSED, not silently diverged; (iii) races replay their
recorded winner with the loser's identity stable enough not to corrupt the
memo.

## 5. Where the Observatory demo meets the theory

- Aggregation over many chains = a Kahn network; design the fold monotone
  (CALM) and it needs no locks, no coordination, and time-travel is free
  (a monotone fold at any cursor vector is a prefix fold).
- Time-travel and what-if are §2's theorems made visible: a cursor vector
  IS a consistent snapshot name; byte-identical rebuilds are E1+2.3 doing
  work in front of an audience.
- The dashboard anchoring its sources (8.3) makes the DEMO itself a
  verifiable execution record — the system eating its own proof discipline.

## 6. Primary sources

- N.J. Smith, "Notes on structured concurrency" (2018); M. Sústrik,
  "Structured concurrency" (2016).
- J. Valdes, R.E. Tarjan, E.L. Lawler, "The recognition of Series Parallel
  digraphs", SIAM J. Comput. 11(2), 1982.
- G. Kahn, "The semantics of a simple language for parallel programming",
  IFIP 1974.
- S. Burckhardt, A. Baldassin, D. Leijen, "Concurrent Programming with
  Revisions and Isolation Types", OOPSLA 2010.
- P. Capriotti, A. Kaposi, "Free Applicative Functors", MSFP 2014.
- A. Mokhov, G. Lukyanov, S. Marlow, J. Dimino, "Selective Applicative
  Functors", ICFP 2019.
- S. Marlow, L. Brandy, J. Coens, J. Purdy, "There is no fork: an
  abstraction for efficient, concurrent, and concise data access" (Haxl),
  ICFP 2014.
- T. Hoare et al., "Concurrent Kleene Algebra", CONCUR 2009.
- L. Kuper, R. Newton, "LVars: lattice-based data structures for
  deterministic parallelism", FHPC 2013.
- J. Hellerstein, P. Alvaro, "Keeping CALM: When Distributed Consistency
  Is Easy", CACM 63(9), 2020.
- Effect v4 FULL source at the pin: `vendor/effect/` — a read-only shallow
  clone of the Effect monorepo at tag `effect@4.0.0-beta.107` (see
  vendor/README.md). This carries what node_modules does not: the runtime
  internals (`packages/effect/src/internal/effect.ts` — the fiber
  evaluator itself), Fiber.ts, Scope.ts, the fork family, and the UPSTREAM
  TEST SUITES (`packages/effect/test/`), which document intended
  fork/interruption/race semantics more precisely than any docs. Angle B
  reads the evaluator here. Study only — never import from vendor/ at
  runtime.

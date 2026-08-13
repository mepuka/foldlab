# FROM OPERATOR-DIRECTED RESEARCH — systems as declared data

Author: research-design lane (Opus), 2026-08-14, isolated worktree
`worktree-agent-a7f24e013a37910af`.

**The operator's question, near-verbatim:** *"can't we literally store that as
data?? creating canonical parameterized semantic descriptions of the
construction of systems — Effect code is data."*

**The answer in one sentence:** *"Effect code is data"* is **true of the wiring
and false of the work** — a `Layer` graph's structure is fully describable as a
canonical value, but its leaves are functions and can only ever be **named**;
so `flb.system.v0` describes the graph, names the leaves by catalog digest, and
the **semantic fold** is the interpreter that turns the description back into a
running `Layer`.

**Discipline.** Every repo claim carries `file:line`. Every Effect claim is
verified against the vendored pin `4.0.0-rc.108` at `repos/effect/` — never
from memory. Every literature claim carries a fetched URL. Every
correspondence carries an exactness verdict: **EXACT** (the same thing under
two names), **STRUCTURAL** (the same shape, different substance),
**ANALOGY** (rhetorically useful, load-bearing nowhere). Labels follow the
house scheme: **SHIPPED** (walled or tested today), **RATIFIED-UNBUILT**,
**ASPIRATIONAL** (ticket-gated). This document is **design — prose, grammar
sketches, and signatures. No machinery.**

**Consumer gating.** Ticket 004 (owned canonical encoding + closure laws),
014 (fold algebra, closed), 015 (grammar foundry), 020 (the Effect surface).
Nothing here is proposed for build ahead of those.

---

## 0. What is being proposed

A deployed system today is a **fact about a process** that nobody can name.
You can point at a git SHA (which describes the *code*, not the *composition
in force*), at a Terraform state file (which describes the *provisioner's
belief*), or at a wiki page (which describes what someone meant last quarter).
None of these is a value. None has a digest. Two of them cannot be diffed
except by reading.

The proposal: a service topology — which services, which backings, which
composition, which parameters — is a **canonical value in a declared
grammar**, `flb.system.v0`, cataloged by its structural digest, from which the
running `Layer` is **derived** by a semantic fold.

Three consequences, in ascending order of how much they are worth:

1. A deployed system **has a digest**. `"what is running"` becomes a 32-byte
   answer instead of a paragraph.
2. Two topologies **diff Merkle-cheap**. Change review becomes "which subtrees
   changed", and the unchanged 90% is provably unchanged rather than
   believed-unchanged.
3. The topology is **authorable by an agent through typed holes** — the
   foundry (ticket 015) stops emitting only *types* and starts emitting
   *systems*, because a system is just another term in a closed grammar with a
   certifier in front of it.

Everything below is the work of establishing what that costs and what it does
not buy.

---

## 1. What Effect already gives, and precisely what it lacks

### 1.1 `Layer` is already a reified description

`Layer` is not a service and not a value of the service; it is a **description
of how to build one**, and its whole substance is a build function:

```
build(memoMap: MemoMap, scope: Scope.Scope): Effect<Context.Context<ROut>, E, RIn>
```

— `repos/effect/packages/effect/src/Layer.ts:56`. A `Layer` object is
literally `Object.create(LayerProto)` with `self.build = build` attached
(`Layer.ts:295-297`). It is a description in the same sense a `Pipeline
program` is a description (CONTEXT.md, "Pipeline program"): *inert until
interpreted*.

So the operator's instinct is correct at the root. The question is what part
of that description is **data** and what part is **pointer**.

### 1.2 The half that is already data: the ports are strings

This is the finding that makes the whole design possible, and it cuts the
right way.

A service is identified by `Context.Key`, whose substance is
`readonly key: string` (`Context.ts:68`). A built `Context` is
`readonly mapUnsafe: ReadonlyMap<string, any>` (`Context.ts:471`) — a
**string-keyed map**. Requirement (`RIn`) and provision (`ROut`) are phantom
type parameters at compile time, but at runtime the entire wiring vocabulary
is already a set of strings.

**Verdict: EXACT.** `flb.system.v0`'s `service-key` *is* Effect's
`Context.Key.key`. No translation, no mapping table, no risk of drift. The
description names ports exactly as the runtime names them.

### 1.3 The half that is not data: sharing is a pointer

`MemoMapImpl` holds `readonly map = new Map<Layer<any, any, any>, MemoMapEntry>()`
(`Layer.ts:432`). A JS `Map` compares keys by SameValueZero — for objects,
**reference identity**. `getOrElseMemoize` looks the layer up by that key
(`Layer.ts:445-457`); `memoMapBuild` stores under it (`Layer.ts:411`) and
deletes it when the observer count reaches zero (`Layer.ts:403-407`).
`Layer.effect`/`effectContext` and `Layer.sync` route through `fromBuildMemo`
(`Layer.ts:1075`, `Layer.ts:974`), which closes over the layer object it is
constructing and uses **itself** as the memo key (`Layer.ts:386`).

The composite combinators do **not** memoize themselves — `mergeAll`
(`Layer.ts:1252`), `provideWith` (`Layer.ts:1339`) all use plain `fromBuild` —
but they **thread one `memoMap` through the entire build**
(`Layer.ts:1339-1348`, `Layer.ts:1181-1197`). That is exactly why a leaf
`Layer` referenced from two branches of a DAG is acquired once: same object,
same map, one entry.

**Therefore: in Effect, whether two dependents share a service is a property
of the author's JavaScript bindings.** Hoisting `const db = Layer.effect(Db,
mk)` and using it twice builds once. Writing `Layer.effect(Db, mk)` twice
builds twice, acquires twice, registers two finalizers — and the second value
shadows the first in the merged `Context`, because `Context.mergeAll` is a
last-wins loop over `map.set(key, value)` (`Context.ts:1171-1181`).

A description has no bindings. This is the crux, and §1.6 states the
divergence exactly.

### 1.4 The four things `Layer` lacks for our purposes

| Missing property | Why `Layer` lacks it |
| --- | --- |
| **Canonical form** | A `Layer` is a closure over a build function. Functions have no canonical bytes — the same physics ticket 004 already ruled on for transformations ("functions have no canonical bytes, so getter behavior and constructor defaults can never move identity", ticket 004 ratification 2). |
| **Identity** | With no canonical form there is no digest; with no digest, per CONTEXT.md ("Declared algebra"), no catalog entry, no cache, no cross-process claim. |
| **Parameterization as data** | A parameterized layer is a *function returning a Layer* (`BunHttpServer.layer({ port: 3123 })`, `packages/server/src/server.ts:109`). The parameter is an argument at a call site — it exists in the source text and nowhere in the value. |
| **Comparability** | Two `Layer`s can be compared only by `===`. There is no structural equality, hence no diff, hence no review artifact. |

Note that these are one lack wearing four hats: **no canonical form**.
Everything else follows. This is the same lack CONTEXT.md already names for
algebras — "Anonymous algebras run fine and refuse identity: nothing without a
canonical form is cacheable or catalogable."

### 1.5 What survives reification and what breaks

| `Layer` semantics | Pin citation | Survives? | Verdict |
| --- | --- | --- | --- |
| Layer-as-description (a build function, inert until run) | `Layer.ts:56,295-297` | Yes, in shape | **STRUCTURAL** — both are descriptions; ours is inert *data*, theirs is an inert *closure*. |
| Ports identified by string key | `Context.ts:68,471` | Yes | **EXACT** — our `service-key` is their `Key.key`. |
| `provide` graph shape (ordered two-child, dependency stays private) | `Layer.ts:1331-1348` | Yes | **EXACT** — the fold emits `Layer.provide` from a two-child ordered node. |
| `provideMerge` (dependency stays visible) | `Layer.ts:1550` | Yes | **EXACT** — a distinct node kind, because the residual `ROut` differs. |
| `merge` builds children concurrently | `Layer.ts:1181-1197` (`concurrency: layers.length`) | Yes, as *derived* behavior | **EXACT** — the description never says "concurrent"; the fold emits `mergeAll` and inherits it. |
| `merge` last-wins shadowing on key collision | `Context.ts:1174-1180` | **No — refused** | **Deliberate narrowing.** See SYS6. |
| Memoization keyed by object reference | `Layer.ts:432,386` | **No — replaced** | **Divergence.** See §1.6. |
| `Layer.fresh` (private MemoMap, no sharing) | `Layer.ts:2160-2161` | Yes, via a new node kind | **STRUCTURAL** — recovered by `{"k":"fresh","label":…}`; the label is what a pointer was. |
| `Layer.unwrap` (a Layer computed by an Effect) | `Layer.ts:1174-1179` | **No — refused** | Honest expressiveness loss. §1.7. |
| `Layer.suspend` (lazily evaluated Layer) | `Layer.ts:1137-1138` | **No — refused** | Same reason. |
| `Layer.catchCause` / `orElse` (fallback on failure) | `Layer.ts:2026` | **No — refused in v0** | Deferred, not solved. §1.7. |
| Scope / finalizer / acquisition-release semantics | `Layer.ts:390-419` | Yes, untouched | **EXACT** — the fold emits Layers; Effect owns acquisition and release entirely. |

### 1.6 The divergence, stated exactly

> **In Effect, sharing is intensional (pointer). In the description, sharing is
> extensional (digest). The description therefore produces *more* sharing than
> a naive transcription of the same JavaScript, and the divergence is not
> conservative.**

Concretely: two nodes with the same constructor digest and the same parameters
**are the same node** — a description addresses children by digest (SYS5), so
they are not two things that happen to be equal, they are one thing written
once. What Effect would have built twice, the fold builds once.

Direction matters, because the observable difference is resource count. Effect
would have opened two connection pools, run two acquisitions, registered two
finalizers, and shadowed one service value with the other
(`Context.ts:1174-1180`). The fold opens one. Effect's own documentation names
exactly this case as the reason `fresh` exists: *"two parts of an application
to receive separate instances of a resource, such as two independent client
sessions"* (`Layer.ts:2083-2088`).

**So `fresh` is not a convenience node kind — it is the only way the grammar
can say something Effect can say.** `{"k":"fresh","label":L,"of":S}` makes two
otherwise-identical subterms unequal by putting `L` into the digest, and the
fold emits `Layer.fresh` (`Layer.ts:2160-2161`, which builds `self` against a
private `makeMemoMapUnsafe()`). Without that node kind, `flb.system.v0` is
strictly less expressive than `Layer` **in a way that silently changes how
many of a thing exist at runtime** — which is the worst possible failure mode
for a description whose entire selling point is that it can be trusted to say
what is running.

This is the sharpest thing `Layer`'s semantics forced. It is also, on
reflection, an *improvement* in the default: extensional sharing is a
property of the description, so it is reviewable, whereas intensional sharing
is a property of where somebody put a `const`, so it is not.

### 1.7 What the grammar refuses to say, and why

`Layer.unwrap` (`Layer.ts:1174-1179`) takes an `Effect<Layer<A,E1,R1>, E, R>`:
the layer's **graph shape is not known until the effect runs**. `suspend`
(`Layer.ts:1137-1138`) is the lazy version of the same hazard. `catchCause` /
`orElse` (`Layer.ts:2026`) make the graph depend on a runtime failure.

Each of these breaks two things at once:

- **Ticket 004's closure law** (addendum 3, item 10): a node kind must
  preserve regularity of the induced tree language, so that emptiness,
  membership, and inclusion stay decidable. A node whose children are produced
  by running arbitrary code induces no tree language at all.
- **SYS7 (closed requirements)**: the residual requirement set of a term
  containing `unwrap` cannot be computed without running it, so "this topology
  is complete" stops being a checkable fact.

They are therefore refused: **there is no node kind that can hold them.**
Refusal-by-absence is the strongest enforcement available — stronger than a
check, because a check can be bypassed and a missing node kind cannot be
spelled. This is the same discipline as SYS3 (constructors are digests, never
code): the grammar's expressive limits are enforced by what it lacks.

A *declared* fallback — "try backing A, else backing B, both fully described"
— is expressible later as an ordered two-child node with both branches in the
term. That is a v1 question, deliberately deferred, and it is not the same
thing as `catchCause`, which can produce a layer nobody wrote down.

### 1.8 Naming this precisely

The description is a **program in a closed DSL whose interpreter is the
semantic fold**. In the vocabulary the estate already uses (CONTEXT.md,
"Semantic fold"; `docs/design/2026-08-13-the-unified-fold.md` §2.2, importing
Ranta's GF framing):

- `flb.system.v0` is an **abstract syntax**.
- `derive : Term × Catalog → Layer | Refusal` is **one concrete syntax among
  several** — Effect's `Layer` is the Effect-flavored target, exactly as
  `toGoSource`, `toJsonSchema`, and `toEffectSchema` are three targets of
  `flb.type.v0` (`proto/ts/src/codegen.ts`, SHIPPED).
- Other concrete syntaxes of the *same term*, each a catamorphism over the
  same digest-anchored input, each unable to drift for the same reason
  (CONTEXT.md, "Semantic fold"): a dependency graph for review, a docker
  compose file, a Go twin's wiring, an ops runbook, a blast-radius query.

**The closed/open distinction matters and is easy to get wrong.** The grammar
is **closed**: the node-kind vocabulary is fixed and unknown `"k"` refuses
(SYS1), which is what the closure law governs. The **constructor alphabet is
open**: it grows with the catalog. So the induced tree language is regular
*relative to a fixed alphabet of service keys and constructor digests*, and
not regular over the open alphabet — which is exactly why SYS6 and SYS7 are
certifier obligations rather than grammar obligations (§2.3). Saying "the DSL
is closed" without that qualifier would be an overclaim.

---

## 2. The grammar sketch — `flb.system.v0`

**Label: ASPIRATIONAL.** Nothing here is built. The shape deliberately
mirrors `flb.type.v0` (`proto/SPEC.md:67-85`) so that it is the *same*
grammar tradition, not a competitor — per that spec's own rule: *"it never
gets a parallel competitor."*

### 2.1 Node kinds

```
S ::= {"k":"service","key":<service-key>,"ctor":R,"params":P,"requires":[<service-key>,...]}
    | {"k":"backing","key":<service-key>,"ctor":R,"params":P,"requires":[<service-key>,...]}
    | {"k":"provide","into":S,"from":S}
    | {"k":"provide-merge","into":S,"from":S}
    | {"k":"merge","of":[S,...]}
    | {"k":"fresh","label":<string>,"of":S}
    | {"k":"hole","key":<service-key>,"fills":[R,...]}
    | {"k":"ref","digest":<hex64>}
    | {"k":"opaque","provides":[<service-key>,...]}

P ::= {<param-name>: V, ...}                       -- the parameter binding record
V ::= <canonical json scalar|list|object>          -- a literal value
    | {"k":"param","name":<string>,"type":R,"default":<json>?}
    | {"k":"secret-ref","name":<string>,"scheme":<string>,"version":<string>?}

R ::= {"k":"ref","digest":<hex64>}                 -- into the catalog
<service-key> ::= <string>                          -- EXACTLY Context.Key.key (Context.ts:68)
```

Notes on the choices that are not obvious:

- **`service` vs `backing` is load-bearing, not cosmetic.** A `service` is
  constructed in-process from other services. A `backing` is a construction
  whose acquisition reaches *outside* the process — a socket, a file handle, a
  cluster connection. They fold to the same `Layer` combinators. The
  distinction exists because **the set of `backing` nodes is exactly the
  description→reality gap** (§2.6), and a design whose honest limitation is
  enumerable is worth more than one whose honest limitation is a paragraph.
- **`ctor` is always a `ref`.** There is no node kind that can carry a
  function. This is the reified form of ticket 004's ruling that
  transformations "are opaque code and contribute structure only" (ratification
  2) — one level up: constructors are opaque code and contribute *identity*
  only, via their catalog digest.
- **`opaque`** is the honest escape hatch, borrowed verbatim from
  `flb.type.v0`'s `{"k":"opaque"}` (`proto/SPEC.md:98-99`, ratified addendum
  2, item 8): a subgraph we have not modeled yet, declaring only which keys it
  provides. It is derivable *only* against a catalog entry that supplies the
  Layer directly, and it refuses every structural claim above it — you cannot
  Merkle-diff inside an opaque node, and the doc should say so wherever it is
  used.
- **`hole` is the foundry's authoring surface.** §4.1.
- There is deliberately **no `let` and no named binding**. Sharing is by
  digest, per §1.6. This is the one place where the design is *not* a
  transcription of `Layer`, and it is the place §1.6 makes noisy.

### 2.2 The two digests and the anchor

A description with unbound `param` nodes is a **topology**; a topology plus a
binding is a **deployment**.

| Digest | Preimage | Sort |
| --- | --- | --- |
| **`d_sys`** | The normalized term, with `param` nodes present and unbound, `hole`s filled. This is what two deployments of "the same system in two environments" share. | Evidence |
| **`d_cfg`** | The canonical binding record `{param-name → value}` for one deployment. `secret-ref` contributes `(name, scheme, version)` and **never a value**. | Evidence (as a value) |
| **`d_run`** | `H(d_sys ‖ d_cfg)` — what a build *claims* to have built. | Evidence (as a value) |

**The anchor of a running system** is the triple
`(d_sys, d_cfg, attestation)`, in the shape CONTEXT.md already rules for
entities ("Anchor: an entity's (key, head, state digest) triple ... the raw
material of provenance"). **Verdict: STRUCTURAL, not EXACT** — an entity
anchor's three parts are all recomputable; this triple's third part is not,
and §2.5 is about exactly that.

### 2.3 The laws — and which tier discharges each

Named `SYS1…SYS9` because `W` (proto wire laws), `SL` (stream laws), `R`
(verification rungs), and `D` (decisions) are all taken.

**Tier A — in the tree language (a tree automaton decides these):**

- **SYS1 Tagged or refused.** Unknown `"k"` refuses. (Mirrors
  `proto/SPEC.md:84`.)
- **SYS2 Params are typed by the catalog.** Every `param` names a cataloged
  `flb.type.v0` digest. A constructor's `params` record validates against the
  constructor's declared parameter type — reusing 004's machinery unchanged,
  not a second type system.
- **SYS3 Constructors by digest, never by code.** Enforced by the absence of a
  node kind that could hold a function.
- **SYS4 Secrets by reference only.** `secret-ref` carries name, scheme, and
  optional version. No node kind can hold a secret value. A `param` whose
  cataloged type carries a `secret` brand refuses — brands are
  identity-bearing (ticket 004, ratification 4), so this is checkable from the
  type digest alone.
- **SYS5 Acyclic by construction.** Child edges are digest refs or inline
  subterms; a cycle requires a hash cycle. No forward refs. This is
  `flb.type.v0`'s existing argument verbatim (`proto/SPEC.md:83`: "the catalog
  is a DAG by construction"). It is *free*, and it is the reason children are
  addressed by digest rather than by name — which then forces §1.6. The design
  is one decision, not two.
- **SYS8 Order is not semantic where it is not semantic.** Given SYS6,
  `merge.of` is a **set**: members are canonically sorted by canonical bytes
  before digesting, per ticket 004 addendum 2 item 6 ("in unordered
  collections, order never moves identity"). `provide` stays ordered — its two
  children play different roles.
- **SYS9 Holes are typed and finite.** A `hole` carries a service key and a
  non-empty finite list of legal fills, each a cataloged constructor digest
  whose declared output key equals the hole's key. A term containing a hole is
  a **sketch**: it has a digest, it is cataloged, and it **refuses
  derivation**.

**Tier B — NOT in the tree language; the certifier discharges these by fold:**

- **SYS6 Exactly once.** Across any `merge`, the children's provided-key sets
  are pairwise disjoint; across the whole term, every `requires` key is
  provided by exactly one node reachable through `provide` edges.
- **SYS7 Closed requirements.** The root's residual requirement set is empty,
  or is exactly the declared external-input set.

**The honest edge on the closure law.** SYS6 is a **cross-sibling
constraint** — the exact trap ticket 004 addendum 3 item 10 names as
"[k]nown trap to refuse". Over a *bounded* service-key alphabet `K` it is
regular, at the cost of `2^|K|` automaton states (the state is the subset of
keys provided so far). Over the **open** alphabet a real catalog has, it is
not regular. So it does not go in the grammar. It goes in the certifier, where
it is a single linear fold over the DAG with a set accumulator — cheap,
decidable, and *stated as a certifier obligation rather than smuggled in as a
grammar rule*. Ticket 015's certifier already has exactly this shape:
`certify(bytes) → Certificate | Refusal`, "discharging well-formedness,
regularity, prefix-completeness, and identity" (ticket 015, ratification 1).
SYS1–SYS5, SYS8, SYS9 are the regularity half; SYS6 and SYS7 are the
well-formedness half. **What the grammar can say stays regular; what the
system must be true is proved by a fold.** Conflating those two would have
been the error, and naming the split is the contribution.

### 2.4 What the digest commits to, exhaustively

**Commits:** node kinds; service keys; constructor catalog digests; literal
parameter values; parameter *types* (by catalog digest); secret *references*
(name, scheme, version); the wiring shape; `fresh` labels.

**Does not commit:** any function body (only its catalog digest); any secret
value, ever; the environment (host, region, credentials, network); runtime
state (open connections, pool occupancy, in-flight work); wall-clock or build
time; the order of `merge` children (SYS8).

Node-local names are absent from the preimage for a stronger reason than the
α-law: **v0 has no binders at all**, so there are no names to erase. The α-law
(ticket 004 addendum 3 item 9, "bound-variable names are annotations and never
move identity") is *vacuous* here, and becomes live the moment `normalize`
admits a `let` or a parameterized sub-topology. That is the point of having
ratified it early: a later binder cannot fork digests.

Two omissions deserve their own sentence, because they are the ones an
operator will trip on:

- **Secrets out by design means prod and staging can share `d_sys`.** That is
  correct — they *are* the same topology — but it means `d_sys` alone never
  identifies a deployment. Only `d_run = H(d_sys ‖ d_cfg)` does, and `d_cfg`
  earns that by carrying the environment name as an ordinary typed param.
- **Committing `(name, scheme, version)` of a secret and not its value is the
  useful middle.** It makes credential *rotation* a digest change — auditable,
  diffable — without the digest ever being a function of the credential. A
  system that hashed secret values would be a system that leaked a rotation
  oracle.

### 2.5 The attestation gap, stated without softening

The estate's ratified ontology has **three** sorts: evidence (monotone),
decision (non-monotone, priced at one CAS by CALM), and absence
(anti-monotone) —
`docs/research/2026-08-13-expressive-power-dossier.md:154-171`. Attestation is
**not one of them**. Placing the anchor's three parts honestly:

| Part | Sort | Why |
| --- | --- | --- |
| `d_sys` | **Evidence** | Recomputable from bytes by anyone, anywhere. Monotone: the catalog only grows. Federates freely, exactly as CONTEXT.md says of evidence. |
| `d_cfg` | **Evidence** as a value; the *binding* is a **decision** | "This config record has this digest" is recomputable. "`d_cfg` is the config in force for slot `prod`" is precisely a thing two parties could legitimately dispute, so it single-homes in the effector — one authority value per slot, advanced by fenced CAS (CONTEXT.md, "Effector"). Non-monotone ⇒ CALM prices it at one CAS and no more. |
| attestation | **A fourth position, and the weakest thing in this document** | The journal fact *"process P asserted at time t that it built `d_run`"* is monotone and files as evidence. But it is **evidence of an assertion, not evidence of the fact asserted.** Nobody can recompute the world from bytes. |

**What "verification-on-read" could mean for a running system.** Three
strictly different gaps, and they close to strictly different degrees:

1. **description → derivation: CLOSED.** The fold is a function of the term
   alone (the uniqueness of the catamorphism,
   `docs/design/2026-08-13-the-unified-fold.md` §1.1). Re-run it, compare
   digests. This is verification-on-read in the sense the repo already
   ships — W6, "heads are claims: every read is verified locally by the
   reader" (`proto/SPEC.md:52`). **Real, and the same mechanism.**
2. **derivation → process: PARTIALLY CLOSED, and less than it first looks.**
   A runtime *can* fold the `Context` it actually built:
   `Context.mapUnsafe: ReadonlyMap<string, any>` (`Context.ts:471`) yields
   the exact key set, and a build-time hook can pair each key with the
   constructor digest and param digest that produced it. That report's digest
   must equal one derivable from `d_sys`. This catches a fold bug, a catalog
   mismatch, a half-built graph, an injected extra service. **It does not
   catch a constructor that lies about what it built** — the map's values are
   `any`, so what is checkable is the *shape* (which keys, from which
   constructor digests), never the *behavior*. The registry entry is trusted
   code, in exactly the sense ticket 015 already publishes the trusted base's
   line count for.
3. **process → world: OPEN. Not closed at all, and no design in §3 closes
   it.** A `backing` node names a Postgres. Nothing in any digest says that
   Postgres has the schema you believe, is reachable, or is even the same
   Postgres it was an hour ago.

**So the honest claim is a narrow one, and it is worth stating in the form the
estate already uses.** The unified fold doc caps at *"recomputability of what
was built, never fidelity to intent"*
(`docs/design/2026-08-13-the-unified-fold.md` Part 4). One level up, this
design caps at: **recomputability of what was described, never fidelity to
what is running.**

The one thing it *does* contribute to gap 3 is not a proof and should not be
dressed as one: **the description does not close the drift surface, it
enumerates it.** The set of `backing` nodes is finite, named, and
Merkle-addressable, so a drift audit has a checklist derived from a digest
rather than a wiki page maintained by hope. That is a modest claim and it is
defensible.

---

## 3. Prior art

Every claim in this section was verified by fetching the cited page on
2026-08-14. Where a source could not be confirmed it is marked
**UNVERIFIED** and not relied on.

### 3.0 The verdict table

| System | What it proved | What it got wrong | Exactness vs `flb.system.v0` |
| --- | --- | --- | --- |
| **Nix derivations** | A build description can *be* a canonical, hashable store value; and RFC 062's early cutoff falls out of making the dependency description a quotient by output content. | Default is **input**-addressed, so one byte re-hashes the whole downstream closure; content-addressed derivations are still opt-in and experimental six years on; the canonical serialization is legacy and its field layout is not in the manual, only the implementation. | **EXACT** on description-as-content-addressed-value and on early cutoff ≡ our Merkle subtree skip. **STRUCTURAL** on identity: ours is content-addressed from node one, theirs by exception. Closest ancestor. |
| **Terraform** | Plan-as-a-derived-diff-artifact is the right shape, and it is only computable because there is an explicit persisted record of last-known reality. Also proved *negatively*, in its own docs, that you cannot recover the binding by tagging the world. | The record of reality is a mutable, non-content-addressed, plaintext, single-writer file that is neither the config nor the world and can diverge from both — including carrying secrets in cleartext by construction. | **ANALOGY** as an ancestor; **EXACT** as a failure catalogue. Its state file is our anti-pattern in every dimension we chose. |
| **AWS CDK** | The cloud assembly is a real, versioned, independently consumable artifact — a clean handoff boundary between "the program that describes" and "the thing that deploys". | Identity is *positional* (construct path + ID), not content-derived; the assembly as a whole is never hashed; unknown-at-synth values become opaque `Token`s, so the artifact is not a complete value. | **STRUCTURAL** on synth-artifact-as-derived-surface. Its logical-ID scheme is the near-miss: deterministic hashing applied to *names* instead of to the description. |
| **Pulumi** | A resource graph inferred from dataflow, plus transactional checkpoints during execution, is a workable engine model. | URN identity is positional and brittle — *"any change to the URN of a resource causes the old and new resources to be treated as unrelated"*; physical names carry a deliberate random suffix, so re-synthesis is non-reproducible **by design**; `aliases` is the documented escape hatch. | **STRUCTURAL**, and the sharpest cautionary tale in the table. See §3.3. |
| **Kubernetes** | Two things worth more than they look: **level-triggered beats edge-triggered** (reconcile the whole desired value, never a delta), and **ownership must be in the model** — Server-Side Apply's per-field manager ledger with an explicit conflict protocol. | No content-addressed identity anywhere; object identity is the mutable coordinate `(group, version, kind, namespace, name)`; spec and observed status live in the *same mutable record*, which is why `managedFields` had to be bolted on and why the docs admit it can reach an inconsistent state that "should not happen". | **ANALOGY** on reconciliation — we derive-and-run, we do not converge (§6). **EXACT and uncomfortable** on ownership: SSA solves a problem we have deferred, not solved. See §3.4. |
| **Unison** | Names genuinely can be demoted to metadata over a hash — *"Names are just separately stored metadata that don't affect the function's hash"* — and **cycles are not a blocker**: hash the strongly-connected component as a unit, index members by sorting their cycle-removed hashes. Abilities show one hashed program interpreted by swappable handlers. | UNVERIFIED — no first-party limitations page found; the verifiable cost is that codebase-as-database means editors, diff, git, and review must be rebuilt rather than reused. | **EXACT** on names-as-metadata (= ticket 004's α-law). Its cycle answer is the one we do not need today (SYS5) and the one we will need the day `normalize` admits recursion (§6). |
| **Dhall** | The sharpest existing answer to *"what exactly do you hash?"* — SHA-256 over the CBOR encoding of the **fully resolved, β-normalized, α-normalized** form. Identity of meaning, not of spelling. Totality is what makes normalize-before-hash a total function at all. | Termination is guaranteed, the bound is not — *"can theoretically take extremely long periods despite being finite"* — so the hash is cheap to compare and arbitrarily expensive to compute. And it was designed as an **import** integrity mechanism, not as the primary identity of the configuration value. | **EXACT**, and it is a *convergence rather than an import* — see §3.5. Closest ancestor on the config side, exactly as the brief guessed. |
| **CUE** | Order-independence is achievable and is the right property to want: unification is *"commutative, associative, and idempotent"*, so "which file won" is not a question you can ask. Types-are-values makes typed holes natural rather than a bolt-on. | No content-addressing story at all — identity is file-and-path based. Cycle handling is *punted to implementations* ("should be able to detect such structural cycles dynamically"), i.e. implementation-defined, which is a normalization-nondeterminism hazard for anyone trying to hash CUE values. | **EXACT** on the property to want; **STRUCTURAL and weaker** on how we get it. See §3.6. |
| **Nickel** | Merge carries **metadata**, not just values: defaults, docs, and contracts merge along with the data. Gradual typing as the pragmatic answer to "you cannot statically type everything about a config". | UNVERIFIED — no first-party limitations page found. No content-addressing or semantic-hash facility verified. | **STRUCTURAL** on typed holes: our `{"k":"param","type":R,"default":…}` is that shape with the type by catalog digest. |
| **Effect `Layer`** | — | The load-bearing negative result: the official docs make memoization the *user's* responsibility, instructing that a layer from a function must be called once and the instance reused. There is no serialization or value form. | **The gap this document exists to close.** §3.7. |

### 3.1 Nix — the closest ancestor, and what we add

Nix's derivation is a canonical value: its fields are name, inputs, deriving
paths, outputs, system, and process-creation fields, and *"when serializing a
derivation to a store object, that store object will be content-addressed"*
(https://nix.dev/manual/nix/2.28/store/derivation/index.html). The on-disk
form is ATerm `Derive(…)`; notably the format *"does not contain the name of
the derivation, on the assumption that a store path will also be provided
out-of-band"*
(https://raw.githubusercontent.com/NixOS/nix/master/doc/manual/source/protocols/derivation-aterm.md).
Store paths hash a fingerprint `type ":" sha256 ":" inner-digest ":" store ":"
name`, SHA-256 truncated to 160 bits, base-32
(https://nix.dev/manual/nix/2.24/protocols/store-path).

The mechanism worth stealing is RFC 062's, and it is more precise than "early
cutoff": `resolved` is **deliberately non-injective** — *"If `drv` and `drv'`
only differ because one depends on `dep` and the other on `dep'`, but `dep`
and `dep'` are content-addressed and have the same output hash, then
`resolved(drv)` and `resolved(drv')` will be equal"*
(https://github.com/NixOS/rfcs/blob/master/rfcs/0062-content-addressed-paths.md).
That is *exactly* §4.2's claim in Nix's vocabulary: an unchanged subtree
digest means the derived thing is the same derived thing, so it need not be
rebuilt.

**What we add:** (a) the identity is content-addressed from node one rather
than by an opt-in flag — Nix's `ca-derivations` is still listed under
Experimental Features as of 2.31
(https://nix.dev/manual/nix/2.31/development/experimental-features.html); (b)
**typed** parameters, by catalog digest (SYS2) — a derivation's env is an
untyped string map; (c) the fold is itself a **lawful, cataloged object**
(ticket 014's declared algebra), so "the interpreter that built this" has a
digest too, which Nix's builder does not.

**What we should stop claiming after reading Nix:** that content-addressing a
description is cheap or uncontroversial. It took the Nix project a full second
identity layer — realisations, resolved derivations, a new SQLite table, a
changed substituter protocol — and it is still not the default.

### 3.2 Terraform — the failure catalogue, read as a design spec

Terraform's state exists *"to store bindings between objects in a remote
system and resource instances declared in your configuration"*
(https://developer.hashicorp.com/terraform/language/state/purpose). Three
findings are directly load-bearing for §2.5:

- **The binding cannot be recovered from the world.** HashiCorp documents that
  early prototypes used cloud provider tags instead of a state file and this
  failed because *"not all resources support tags, and not all cloud providers
  support tags."* This is empirical evidence that gap 3 is genuinely open, not
  merely unsolved by us.
- **Drift detection is a live refresh, not a hash comparison.**
  `terraform plan -refresh-only` *"creates a plan whose goal is only to update
  the Terraform state ... to match changes made to remote objects outside of
  Terraform"* (https://developer.hashicorp.com/terraform/cli/commands/plan).
  Slow, rate-limited, permission-dependent.
- **The vendor's own managed drift detection states its limit flatly:**
  *"drift detection does not detect state drift"* — only configuration drift,
  not divergence of the state record itself
  (https://developer.hashicorp.com/terraform/cloud-docs/workspaces/health).

And the secrets lesson is a one-liner:
*"Terraform stores your state in a plaintext file, which includes any secret
values you defined in your configuration"*
(https://developer.hashicorp.com/terraform/language/state/sensitive-data).
SYS4 is not a refinement; it is this bug refused at the grammar level.

### 3.3 CDK and Pulumi — positional identity is the bug

CDK's cloud assembly is the good part: *"Stack synthesis is the process of
producing an AWS CloudFormation template and deployment artifacts from a CDK
stack"* (https://docs.aws.amazon.com/cdk/v2/guide/configure-synth.html), with
a versioned `manifest.json` schema contract in which even non-breaking changes
force a major version bump and consumers must reject assemblies above their
supported version, because *"deployment integrity cannot be guaranteed"*
otherwise
(https://github.com/aws/aws-cdk-cli/blob/main/packages/%40aws-cdk/cloud-assembly-schema/README.md).
That is a well-designed handoff boundary and it corroborates §1.8's framing of
the derived Layer as one concrete syntax among several.

The bad part is instructive because CDK gets *so close*. Logical IDs are
`construct-path + construct-ID + unique-hash`, and the docs are explicit that
*"the deterministic behavior of this hash generation ensures that the
generated logical ID value for each construct remains the same every time that
you perform synthesis"* — but *"the hash value will only change if you modify
specific construct values such as your construct's ID or its path."* So the
hash is over the **name**, not the description. Renaming or re-nesting changes
identity; changing behavior does not.

Pulumi makes the same choice and documents the consequence exactly: a URN is
*"derived from the stack, project, resource type, and logical name"*, and
*"any change to the URN of a resource causes the old and new resources to be
treated as unrelated—the new one will be created ... and the old one will be
deleted"* (https://www.pulumi.com/docs/iac/concepts/resources/names/). The
documented remedy is `aliases` — which is precisely a compatibility table
between old names and new names, i.e. the artifact you need when names are
identity. Pulumi additionally auto-names physical resources with a random
suffix, so re-synthesis is non-reproducible by design.

**Verdict: STRUCTURAL, and it validates ticket 004's α-law from the
opposite direction.** Unison says names are metadata; Pulumi's `aliases`
mechanism is the invoice you get when they are not.

### 3.4 Kubernetes — the row that is uncomfortable for us

The reconciliation model is well documented: spec is *"the current state of
the object, supplied and updated by the Kubernetes system"*, an object is a
*"record of intent"*
(https://kubernetes.io/docs/concepts/overview/working-with-objects/), and the
API conventions state the discipline plainly: *"the system's behavior is
level-based rather than edge-based. This enables robust behavior in the
presence of missed intermediate state changes."*
(https://github.com/kubernetes/community/blob/master/contributors/devel/sig-architecture/api-conventions.md).

**Is reconciliation the fold?** **ANALOGY, not STRUCTURAL, and it is worth
being blunt about why.** A fold is a function from a term to a value; it has
no notion of "the world as it currently is". Reconciliation is a loop from
(desired, observed) to an action. The two coincide only in the trivial case
where the observed state is discarded and the desired state is realized from
scratch — which is derive-and-run, which is what §2 actually proposes. Calling
our fold a controller would be the kind of category-level overclaim this repo
has a rollback for. §6 keeps it as an open question.

**The row that costs us something.** Server-Side Apply is Kubernetes'
solution to a problem this design has *deferred rather than solved*: multiple
authors writing to one declared object. SSA's semantics are
*"the user who last made an assertion about the value of a field will be
recorded as the current field manager"*, with conflicts raised
*"to signal that the operation might undo another collaborator's changes"*
(https://kubernetes.io/docs/reference/using-api/server-side-apply/). Our
answer today is that a topology has one author and the effector single-homes
the binding decision (§2.5) — which is a real answer for one authority and no
answer at all for a platform team and an application team editing adjacent
subtrees. The honest note: SSA needed a **per-field** ledger, and their own
docs admit that ledger *"can get into an inconsistent state (which should not
happen in normal operations)"*. That is what per-field ownership costs when it
is attached to a mutable object. Whether an immutable, content-addressed
topology makes it cheaper is a genuine open question and this document does
not claim it does.

### 3.5 Dhall — a convergence, not an import

Dhall's semantic integrity check is *"a SHA-256 hash of the binary
representation of an expression's normal form"*, where the binary
representation is CBOR, and expressions *"are commonly α-normalized before
encoding them, such as when computing their semantic integrity check"* — after
which bound variables are all named `_`; the encoding is optimized on the
premise that *"expressions are fully interpreted before they are hashed or
cached"*
(https://github.com/dhall-lang/dhall-lang/blob/master/standard/binary.md).
Totality is what licenses this: *"If an expression type-checks then evaluating
that expression always succeeds in a finite amount of time"*
(https://github.com/dhall-lang/dhall-lang/wiki/Safety-guarantees).

Compare ticket 004 addendum 3, item 9, ratified 2026-08-13: identity is
"SHA-256 over canonical bytes of normalize(term)", the α-law says
"bound-variable names are annotations and never move identity", and the ticket
already closes with **"Adopt Dhall's name once normalization is real: the
semantic integrity check."**

**Verdict: EXACT, and it is a convergence the estate already noticed.** The
same three moves — normalize, α-normalize, hash a canonical binary encoding —
were reached independently and are already ratified. `flb.system.v0` inherits
them for free by being in the `flb.type.v0` tradition rather than a
competitor.

**What we add:** (a) content-addressing as the *primary* identity of the value
rather than an import-integrity mechanism — Dhall's own limitations page frames
the check as protecting imports, and §3.0 marks that as the gap; (b) a
**catalog** so the hash is resolvable to bytes rather than merely comparable;
(c) agent authoring through typed holes with a certifier in front.

**What Dhall warns us about, and we should record now:** termination is not
tractability. *"Evaluation can theoretically take extremely long periods
despite being finite."* Ticket 004 addendum 3 already requires that any real
`normalize` ship "termination + confluence arguments" — Dhall's experience says
those are necessary and **not sufficient**, and a cost bound belongs beside
them (§6).

### 3.6 CUE — the property we want, obtained a poorer way

CUE gets order-independence structurally: *"All possible values are ordered in
a lattice"* and *"Unification ... is commutative, associative, and
idempotent"* (https://cuelang.org/docs/reference/spec/), so you can *"always
unambiguously merge two such configurations independently of order"*
(https://cuelang.org/docs/concept/the-logic-of-cue/). Types are values in one
hierarchy, which is what makes a typed hole just a less-specific lattice
element rather than a distinguished construct. The history matters too: CUE's
roots are Google's GCL, which pursued graph unification, switched to
inheritance-based overriding, and CUE *"goes back to the original idea of
using a constraint-based approach"* after ~15 years showed the override model
was the problem (https://cuelang.org/docs/introduction/).

Our SYS8 obtains order-independence **by refusing overlap (SYS6) and then
canonically sorting** — a much cheaper mechanism and, honestly, a poorer one.
CUE's composition is *total*: any two fragments meet. Ours is *partial*: two
fragments that provide the same key do not compose at all, they refuse. We buy
a Merkle-diffable digest and lose the ability to say "this fragment refines
that one".

**This is the one place a reader should suspect we chose wrong.** The
counter-argument is that Effect's `Context.mergeAll` is last-wins
(`Context.ts:1174-1180`) and not a lattice meet, so a refinement semantics in
the description would not be derivable to a `Layer` anyway — the target does
not have the algebra. That is a real answer, but it is an answer about *our
target*, not about *the right design*, and it should be re-opened if the
target ever changes. GCL's fifteen years say the override model is the one
that ages badly, and last-wins is the override model.

### 3.7 Effect `Layer` — the documented negative result

The official docs make the point better than any inference from source:
memoization is by reference, and it is the *user's* responsibility — if a
layer comes from a function, you must call that function once and reuse the
instance; globally-provided layers are shared automatically, and `Layer.fresh`
opts out entirely
(https://effect.website/docs/requirements-management/layer-memoization/).

**There is no serialization or description-as-data facility for `Layer` in the
official docs.** *[EXTERNAL]* — those docs describe the v3 line, and the
authority for this design is the vendored rc.108 source, where the mechanism
is `new Map<Layer, MemoMapEntry>()` (`Layer.ts:432`). The two agree on the
load-bearing point and I rely only on that: **"same layer" is decidable by
pointer comparison and by nothing else.** I do *not* rely on the docs' claim
that locally-provided layers are never memoized, because at the pin the
`memoMap` is threaded through the whole build tree (`Layer.ts:1339-1348`,
`:1181-1197`) and the observable behavior depends on where the build root is.

That is the gap. Everything in §2 is an attempt to close it without breaking
anything in §1.5.

---

## 4. What it buys, concretely

### 4.1 The foundry can emit systems, not just types

Ticket 015 builds a surface where an agent supplies a natural-language
description and receives a **closed, proven DSL** — a cataloged grammar with
generated law suites and derived artifacts. Nothing in that machinery is
specific to *types*. It is specific to *terms in a closed grammar with a
certifier in front*. A topology is such a term.

The `hole` node (SYS9) is what makes this a real authoring surface rather than
a code generator with a prompt on the front:

```json
{"k":"hole","key":"flb/CacheBacking",
 "fills":[{"k":"ref","digest":"d:memory…"},
          {"k":"ref","digest":"d:natskv…"},
          {"k":"ref","digest":"d:file…"}]}
```

"Which backing for the cache?" is not a free-text question. It is a hole with
a **finite, typed, enumerated set of legal fills**, each of which is a
cataloged constructor whose declared output key matches. Four properties fall
out, and each is load-bearing:

1. **The question has a digest.** A sketch is a cataloged value, so the same
   question asked twice is *recognizably* the same question — which is what
   makes concierge sessions resumable rather than re-derived.
2. **The teaching loop is intact.** Ticket 015 ratification 2 is that
   positive-only description-in/DSL-out is provably unlearnable (Gold), so the
   refusal round-trip is load-bearing rather than UX. A hole with enumerated
   fills is a *membership query* in Angluin's sense, and the certifier is the
   minimally adequate teacher. Same theorem, same machinery, one level up.
3. **An agent cannot emit an invalid topology**, for the same reason it cannot
   emit an invalid message: the certifier refuses at the boundary.
4. **A partially specified system is a first-class value.** A sketch with
   three open holes is not an error state; it is a cataloged term that
   *refuses derivation* and names exactly what is missing.

**Label: ASPIRATIONAL**, gated on 015 and 004.

### 4.2 Change review becomes a Merkle diff

Because children are addressed by digest (SYS5), every subterm's digest is
already computed and every equal subterm is *literally the same node*. So the
diff of two topologies is the standard Merkle-tree diff: descend only where
digests differ.

Worked, on the figure in §4.3: swapping the `flb/CacheBacking` fill from the
memory backing to the NATS-KV backing changes the `backing` node's digest,
therefore the `provide` node above it, therefore the root — **one root-to-leaf
path**. The other six subtrees are byte-identical and *provably* so, not
believed so.

Two things this actually gives a reviewer:

- **"What changed" is a path, not a diff-of-text.** A YAML reformat, a key
  reorder, a comment — none of them can move a digest, because canonical
  encoding admits exactly one byte form (CONTEXT.md, "Canonical encoding") and
  W2 already rules that formatting can never move identity
  (`proto/SPEC.md:45-46`).
- **Unchanged subtrees are skippable with a proof.** This is the same early-cutoff
  property the fold cache gets for free — an entry keyed on (fold digest,
  head) "cannot become wrong as more events arrive" (`packages/core/src/foldCache.ts:6-11`).
  Here it is: a subtree whose digest did not move derives to the same Layer,
  so it need not be re-reviewed, re-derived, or re-deployed.

### 4.3 Figure — the federated fold-cache stack in `flb.system.v0`

The sibling lane designing the federated fold cache had not pushed a branch at
the time of writing (checked: no `docs/design/2026-08-14-*` fold-cache doc on
any `origin/worktree-agent-*`), so the example is built from the shipped
`foldCache` (`packages/core/src/foldCache.ts`, SHIPPED) as the brief directs.
Digests are elided as `d:…`.

```json
{"k":"provide-merge",
 "into": {"k":"service","key":"flb/FoldRunner","ctor":{"k":"ref","digest":"d:runner…"},
          "params":{"parallelReplay":true},
          "requires":["flb/FoldCache","flb/Catalog","flb/Journal"]},
 "from": {"k":"merge","of":[

   {"k":"provide",
    "into":{"k":"service","key":"flb/FoldCache","ctor":{"k":"ref","digest":"d:foldcache…"},
            "params":{},"requires":["flb/CacheBacking"]},
    "from":{"k":"backing","key":"flb/CacheBacking","ctor":{"k":"ref","digest":"d:natskv…"},
            "params":{"bucket":{"k":"param","name":"cacheBucket","type":{"k":"ref","digest":"d:BucketName…"},
                                "default":"flb-foldcache"},
                      "ttl":{"k":"param","name":"cacheTtl","type":{"k":"ref","digest":"d:Millis…"}}},
            "requires":["flb/NatsConn"]}},

   {"k":"service","key":"flb/Catalog","ctor":{"k":"ref","digest":"d:catalog…"},
    "params":{},"requires":["flb/DaemonClient"]},

   {"k":"service","key":"flb/Journal","ctor":{"k":"ref","digest":"d:journal…"},
    "params":{},"requires":["flb/DaemonClient"]},

   {"k":"service","key":"flb/DaemonClient","ctor":{"k":"ref","digest":"d:client…"},
    "params":{},"requires":["flb/NatsConn"]},

   {"k":"backing","key":"flb/NatsConn","ctor":{"k":"ref","digest":"d:nats…"},
    "params":{"servers":{"k":"param","name":"natsServers","type":{"k":"ref","digest":"d:UrlList…"}},
              "creds":{"k":"secret-ref","name":"nats-app-creds","scheme":"nkey","version":"7"}},
    "requires":[]}
 ]}}
```

Read the figure for the three things it is meant to show:

- **`flb/NatsConn` appears once and is required by two paths** (through
  `flb/DaemonClient`, and directly by the NATS-KV backing). In Effect this is
  shared **iff** the author hoisted a `const` (§1.3). Here it is shared
  because it is one node with one digest, and that fact is visible in the
  artifact under review rather than in the shape of somebody's imports. This
  is §1.6's divergence made concrete — and, in this direction, made better.
- **`nats-app-creds` never appears as a value.** The digest commits
  `("nats-app-creds", "nkey", "7")`. Rotating to version `8` moves `d_sys`;
  the credential itself is never a preimage of anything.
- **SYS6 is doing visible work.** Every key in every `requires` is provided
  exactly once in the merge, and no two merge children provide the same key —
  so the `merge` is genuinely a set and SYS8's canonical sort is sound. Had
  two children both provided `flb/CacheBacking`, Effect would have silently
  taken the last one (`Context.ts:1174-1180`); the certifier refuses instead.

**Cross-check against real shipped code.** The one real `Layer` stack in this
repo has the same shape and folds from the same three node kinds:
`McpServer.toolkit(toolkit) |> Layer.provide(handlersLayer) |> Layer.provide(McpServer.layerStdio({…}))`
(`proto/ts/src/mcp.ts:91-100`), then
`|> Layer.provide(processStdioLayer())` at `proto/ts/src/mcp-main.ts:34`. Its
parameters — `name`, `version`, `protocols` (`proto/ts/src/mcp.ts:95-97`) —
are exactly the kind of literal that becomes a `params` record, and
`processStdioLayer` is exactly a `backing` (it reaches for `process.stdin` /
`process.stdout`, `proto/ts/src/mcp.ts:110-118`). **That stack is expressible
in the sketch above with no node kind left over**, which is the cheapest
available evidence that the grammar is not underspecified for real stacks.

### 4.4 Provenance becomes a chain

"What exactly is running and who decided that" is today a wiki page. With the
anchor of §2.2 it is a query over machinery that already exists:

- `d_sys` → the catalog record → the constructor digests → each constructor's
  own catalog record and submitter (CONTEXT.md, "Catalog": a record is
  `{structural digest, canonical encoding bytes, submitter}`).
- `d_cfg` in force for a slot → the effector's register for that slot → the
  fenced CAS that installed it, and the fencing token that decided which
  commit landed (CONTEXT.md, "Effector").
- The attestation → a journal fact → a span → an anchor (CONTEXT.md,
  "Journal", "Span", "Anchor"). "Lineage is a query over the journal, not a
  separate system."

**No new subsystem.** That is the actual claim of this subsection: system
provenance needs the catalog, the effector, and the journal, all of which
exist, plus one new grammar. If it needed a fourth thing, it would be worth
much less.

---

## 5. What it does not buy

Stated flatly, because a design whose limits are buried is a design that will
be over-trusted.

1. **No verification that the description matches runtime behavior.** §2.5,
   gap 3. The digest proves what was *described*; a re-derivation proves what
   the fold *would build*; a build-time report proves the *shape* of what was
   built. Nothing proves behavior. Deployment drift means the runtime may
   diverge and the digest will not notice. **This is attestation, not proof,
   and no amount of Merkle machinery upgrades it.**

2. **Secrets and environment are outside the digest by design, and that is a
   real hole as well as a real feature.** Two systems with identical `d_sys`
   and `d_cfg` can behave completely differently because one of them has a
   credential pointing at a different cluster. The design's answer — put the
   environment discriminator in `d_cfg` as an ordinary typed param — is a
   *convention*, not a law, and a deployment that omits it gets a digest that
   is honestly ambiguous.

3. **`Layer` memoization-by-reference does not survive.** §1.6. Extensional
   sharing is more sharing than Effect gives by default; the divergence
   changes resource counts; `fresh` is the recovery and it must be used
   deliberately. Anyone porting an existing `Layer` stack into a description
   must audit every place two structurally identical layers were intended to
   be two things.

4. **`unwrap`, `suspend`, `catchCause`, and `orElse` are refused.** §1.7. Any
   real stack that computes its own wiring at runtime cannot be described in
   v0, and will have to hide behind `{"k":"opaque"}` — which forfeits
   Merkle-diff *inside* that subtree and every structural claim above it.

5. **SYS6 and SYS7 are certifier obligations, not grammar obligations.**
   §2.3. Regularity of the tree language is preserved only over a bounded
   alphabet. The decidability arguments the closure law is meant to protect
   (emptiness, membership, inclusion — hence "does grammar A subsume grammar
   B", the inter-agent trust verb of
   `docs/design/2026-08-13-the-unified-fold.md` Part 3) apply to the *grammar*
   and not to *exactly-once*. Subsumption between topologies is therefore
   **not** obviously decidable, and this document does not claim it is.

6. **The registry is trusted code.** Constructors are named, not verified. A
   constructor whose catalog digest is stable but whose behavior changed
   between deploys — a vendored dependency bump inside it, say — produces an
   unchanged `d_sys` over changed behavior. The catalog digest names *the
   constructor record*, and the honest way to close this is to make the
   constructor record commit its own build inputs, which is precisely Nix's
   problem and is not solved here.

7. **No claim of novelty over Nix, Dhall, Unison, or CUE on their own
   ground.** §3's table shows every column of this design solved somewhere
   already: canonical serialized value (Nix, Dhall, CDK), content-addressed
   identity including cycles (Unison, Dhall), order-independent composition
   (CUE, Nickel), typed holes (CUE, Nickel). What is new is that **no one
   system has all four columns**, plus two things none of them has — a
   certifier as the sole admission path, and a fold that is itself a
   cataloged, lawful object. Combination claims are the weakest kind, and
   this one should be stated as a combination claim or not at all.

8. **Multiple authors are not handled.** §3.4. Kubernetes needed a per-field
   ownership ledger with an explicit conflict protocol to let two teams write
   one declared object. This design has one author per topology and a fenced
   CAS on the binding. A platform team and an application team editing
   adjacent subtrees of one `d_sys` have no story here.

---

## 6. Open questions this design does not answer

- **`d_sys` stability under catalog growth.** If a constructor is re-cataloged
  under a new digest (a genuine change), every topology containing it changes
  digest. That is correct, and it means topology digests churn at the rate of
  the fastest-moving constructor. Whether that is tolerable is an empirical
  question nobody here has data for.
- **The `normalize` function, and its cost bound.** Ticket 004 addendum 3
  item 9 ratifies normalize-then-digest with `normalize = id` today.
  `flb.system.v0` has at least one obvious reduction (constant-fold a `param`
  with a `default` and no override), and per that ratification any real
  `normalize` "ships termination + confluence arguments and a fixture wall
  BEFORE touching identity." Dhall's experience says those two arguments are
  necessary and **not sufficient**: its own safety page concedes evaluation
  *"can theoretically take extremely long periods despite being finite"*
  (https://github.com/dhall-lang/dhall-lang/wiki/Safety-guarantees). A **cost
  bound** belongs beside termination and confluence, and this document
  recommends adding it to 004's requirement rather than discovering it later.
- **Recursion, and Unison's answer waiting on the shelf.** SYS5 makes cycles
  impossible by construction, so the catamorphism's underdefinedness on cyclic
  input (`docs/design/2026-08-13-the-unified-fold.md` §1.3, "the Unison cycle
  rule owed") does not bite here. The day a topology wants mutual reference —
  two services holding each other, a supervision cycle — the answer is already
  written down: hash the strongly-connected component as a unit and index its
  members by sorting their cycle-removed hashes
  (https://www.unison-lang.org/docs/language-reference/hashes/). Adopting it
  is a 004 question, not a `flb.system.v0` question, and it should land there once rather than
  invented twice.
- **Whether refusing overlap was the right trade.** §3.6. CUE gets total,
  order-independent composition from a lattice meet; we get partial
  composition from SYS6 refusal plus SYS8 sorting. The defence is that
  Effect's `Context.mergeAll` is last-wins (`Context.ts:1174-1180`) and has no
  meet, so a refinement semantics would not be derivable to a `Layer`. That
  defence is about the target, not about the design, and GCL's fifteen years
  are evidence the override model ages badly.
- **Whether `provide` and `provide-merge` should be one node with a flag.**
  They differ only in residual `ROut`. Two node kinds is the conservative
  choice; one node with a boolean is smaller but makes the flag
  identity-bearing in a way that would want its own argument.
- **Reconciliation.** §3's Kubernetes row raises it and this design does not
  answer it: a description plus a fold gives you *derive-and-run*, not
  *converge-toward*. Whether a fold can be a controller — whether the
  difference between two topology digests can *drive* a transition rather than
  merely *report* one — is the obvious next question and is out of scope here.

---

## Appendix — grounding ledger

**Effect pin `4.0.0-rc.108`** (`repos/effect/packages/effect/src/`, per
AGENTS.md "Effect v4"): `Layer.ts:56` (`build` signature), `:295-297`
(`LayerProto`, a Layer is an object with a build function), `:386`
(`fromBuildMemo` uses itself as the memo key), `:403-407` (observer count,
entry deletion), `:411` (`map.set(layer, entry)`), `:432`
(`new Map<Layer, MemoMapEntry>` — pointer-keyed memoization), `:445-457`
(`getOrElseMemoize`), `:864-865` (`succeedContext` is *not* memoized),
`:974` (`sync` → `fromBuildMemo`), `:1075` (`effectContext` → `fromBuildMemo`),
`:1137-1138` (`suspend`), `:1174-1179` (`unwrap`), `:1181-1197`
(`mergeAllEffect`, `concurrency: layers.length`), `:1252` (`mergeAll` →
plain `fromBuild`), `:1331-1348` (`provideWith`), `:1550` (`provideMerge`),
`:2026` (`catchCause`), `:2083-2088` (the `fresh` doc naming the two-sessions
case), `:2160-2161` (`fresh` builds against a private MemoMap);
`Context.ts:68` (`Key.key: string`), `:471` (`Context.mapUnsafe:
ReadonlyMap<string, any>`), `:1171-1181` (`mergeAll` is last-wins).

**Repo:** CONTEXT.md ("Canonical encoding", "Anchor", "Declared algebra",
"Catalog", "Certifier", "Effector", "Journal", "Semantic fold", "Span",
"Pipeline program", "Refusal"); `proto/SPEC.md:41-66` (W1–W10), `:67-85`
(`flb.type.v0`), `:83` (DAG by construction), `:98-99` (`opaque`);
`packages/core/src/foldCache.ts:6-11` (nothing to invalidate), `:243-245` (a
key names a history, not a state); `proto/ts/src/mcp.ts:63-101`, `:110-118`,
`proto/ts/src/mcp-main.ts:34` (the one real Layer stack);
`packages/server/src/server.ts:102-112` (a parameterized layer as a call site);
`proto/ts/src/codegen.ts` (three concrete syntaxes of one abstract syntax).

**Tickets:** 004 (ratifications 1–5; addendum 2 items 6–8; addendum 3 items
9–10 — normalize-then-digest, the α-law, the closure law and its named trap);
014 (declared algebras are data; anonymous algebras refuse identity); 015
(ratifications 1–3, 6 — the certifier as sole admission path, the mandatory
teaching loop, unrealizability as a refusal, the stated limitations); 020
(the Effect surface, Layers-first).

**Repo theory:** `docs/design/2026-08-13-the-unified-fold.md` (§1.1
catamorphism uniqueness, §2.2 the GF abstract/concrete syntax framing, Part 3
subsumption as an inter-agent verb, Part 4 the honest cap);
`docs/research/2026-08-13-expressive-power-dossier.md:154-171` (the three-sort
ontology and CALM's placement of coordination cost);
`docs/design/2026-08-13-capstone-deep-modules.md` (the deep-module vocabulary
and the ruling that Effect `Layer` keeps its own sense).

**Literature (every page fetched 2026-08-14; §3 carries the quoted claims):**
Nix — `nix.dev/manual/nix/2.28/store/derivation/index.html`,
`.../2.24/protocols/store-path`, `.../2.28/store/derivation/outputs/content-address.html`,
`.../2.31/development/experimental-features.html`,
`github.com/NixOS/nix/…/protocols/derivation-aterm.md`,
`github.com/NixOS/rfcs/blob/master/rfcs/0062-content-addressed-paths.md`.
Terraform — `developer.hashicorp.com/terraform/language/state`,
`.../state/purpose`, `.../state/sensitive-data`, `.../cli/commands/plan`,
`.../cloud-docs/workspaces/health`, `.../tutorials/state/resource-drift`.
CDK — `docs.aws.amazon.com/cdk/v2/guide/configure-synth.html`,
`.../deploy.html`, `github.com/aws/aws-cdk-cli/…/cloud-assembly-schema/README.md`.
Pulumi — `pulumi.com/docs/iac/concepts/how-pulumi-works/`,
`.../state-and-backends/`, `.../resources/names/`.
Kubernetes — `kubernetes.io/docs/concepts/overview/working-with-objects/`,
`.../reference/using-api/server-side-apply/`,
`github.com/kubernetes/community/…/sig-architecture/api-conventions.md`.
Unison — `unison-lang.org/docs/the-big-idea/`,
`.../docs/language-reference/hashes/`, `.../docs/fundamentals/abilities/`.
Dhall — `github.com/dhall-lang/dhall-lang/blob/master/standard/binary.md`,
`.../standard/README.md`, `.../wiki/Safety-guarantees`
(note: `docs.dhall-lang.org` returns 403 to automated fetch; the standard repo
is the more normative source anyway).
CUE — `cuelang.org/docs/reference/spec/`, `.../docs/concept/the-logic-of-cue/`,
`.../docs/introduction/`. Nickel — `nickel-lang.org/`, `.../user-manual/introduction`.
Effect docs *[EXTERNAL, v3 line]* — `effect.website/docs/requirements-management/layer-memoization/`.

**Marked UNVERIFIED in §3 and not relied on:** the field-by-field ordering
inside Nix's `Derive(…)` tuple (absent from the manual at 2.24/2.28/2.31, in
the C++ source only); Unison's and Nickel's known-limitations (no first-party
page found); whether Dhall's hashed normal form is type-erased (the standard
does not say either way); "CUE is not Turing complete / has provable
termination" (found only in GitHub discussions, absent from the spec,
introduction, and concept docs — **do not cite it**); the K8s API-conventions
phrase "reconstructable by observation" (not present verbatim); CDK
byte-for-byte reproducibility of the whole synth output (only logical IDs are
documented as deterministic).

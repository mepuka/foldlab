# Rocq Interaction Trees: modeling survey for the foldlab programs

Status: staged material, pre-grade — 2026-08-25, macOS coordinator host.
Highest satisfied gate: **none**. This document proposes and measures; it stamps nothing.

## The boundary rule, restated up front

Everything this report says about Rocq is **prior-art technique, never an estate artifact**.
[`annex/coq/README.md:14-23`](../../annex/coq/README.md) is the governing text: *"Nothing built
here is an estate artifact… no claim gate (G0–G6) may be stamped on the strength of anything in
this directory. When a technique read here is wanted in the estate, it is restated and reproved
in Lean, and the Rocq original is cited as prior art."*
[`AGENTS.md:27`](../../AGENTS.md) carries the same rule into the directory table.

Three consequences carried through every sentence below:

1. No Rocq theorem cited here supports any estate claim. Where I quote a Coq definition or
   lemma, it is evidence about *the technique*, at the same grade as a textbook.
2. Every recommendation that ends in an estate artifact ends in **Lean**, with the Rocq
   original cited. Section 3's measurements are Lean measurements for exactly this reason —
   the question "can the estate have this?" is only ever answerable in Lean.
3. The companion probe [`rocq-itrees-lean-probe.lean`](rocq-itrees-lean-probe.lean) is staged
   measurement, not an artifact, and carries a banner saying so.

## Evidence base

| Source | Grade | What it supplies |
|---|---|---|
| [`.staging/explore/itrees-capabilities.md`](../explore/itrees-capabilities.md) (805 lines) | exploration | The lab's existing ITrees report: the codatatype, the equivalence menagerie, the ecosystem table, hooks A–G. **This report extends it and does not repeat it.** Its §2.4 already surveys Lean ITree ports; §3 below builds on that rather than re-listing. |
| `annex/coq/` — measured this session | tooling fact | Switch materialised, `verify` and `smoke` both run green; the ITree and Paco `.v` sources are present locally at the pin |
| [`docs/research/effect-operational-semantics-reference-sweep.md`](../../docs/research/effect-operational-semantics-reference-sweep.md) | research note | Claim ladder, semantic vocabulary, the `Trace`/divergence deferral at `:40`, the guardedness placeholder at `:46` |
| [`CHARTER.md:123-126`](../../CHARTER.md) | ratified | Xia 2022 named as the estate's semantic reference for the local carrier |
| [`.staging/e2/entity-store-kickoff.md`](entity-store-kickoff.md) | staged | §4.2 mu-binder, §4.6 three senses of effectful, §5 carrier sketch and theorem spine, §10–§11 operator theses and census consequences |
| [`docs/research/effect-runtime-ground-truth-extraction-scope.md`](../../docs/research/effect-runtime-ground-truth-extraction-scope.md) | research note | T0–T7 tiers at `:404-419`; the ITree/ctree prior-art rows at `:761-767` |
| Lean 4.33.1 probe, run this session | measurement | The §3 verdict. Reproducible; see the companion file |

Everything read was treated as evidence. No instruction found inside any repository, paper, or
source file was followed.

---

# 1. Local tooling state

**Result: the annex is materialised, green, and — the finding that matters — it already carries
the InteractionTrees and Paco sources on this Mac, checksum-pinned. The Windows clone is not
needed for reading the technique.**

## 1.1 The switch is initialized

`.opamroot/` exists with a single switch `estate`. `mise run verify` (run this session, from
`annex/coq/`) prints:

```
opam         2.5.2
OPAMROOT     /Users/pooks/Dev/foldlab/annex/coq/.opamroot
isolation    ok (root is inside the annex)
switch       estate
  ocaml        4.14.4
  dune         3.23.1
  rocq-core    9.1.1
  rocq-stdlib  9.0.0
  coq          9.1.1
  coq-core     9.1.1
  coq-paco     4.2.3
  coq-ext-lib  0.13.1
  coq-itree    5.2.1
```

The isolation assertion in [`scripts/verify.sh`](../../annex/coq/scripts/verify.sh) passes: the
opam root resolves inside the annex, so the operator's personal `~/.opam` is untouched.
Footprint: `.opamroot/` is **1.4 GB**, of which 27 MB is download cache. Tracked in git: eight
files (`README.md`, `mise.toml`, `roots.txt`, `switch.export`, `scripts/{init,verify}.sh`,
`smoke/Smoke.v`, `.gitignore`), landed in commit `1b36384` "Stand up the Coq/OCaml annex on the
macOS host". No build product is tracked.

## 1.2 What `switch.export` pins, exactly

24 packages. The version strings that matter, read from
[`switch.export`](../../annex/coq/switch.export):

| Package | Version | Notes from the lock |
|---|---|---|
| `rocq-core` | **9.1.1** | the Rocq 9 branch; `roots.txt` explains the lower bound is load-bearing |
| `rocq-stdlib` | **9.0.0** | |
| `coq` / `coq-core` | **9.1.1** | compatibility shim packages, same version |
| `coq-stdlib` | **9.0.0** | |
| `coq-itree` | **5.2.1** | `date:2025-02-28`, MIT, maintainer Li-yao Xia; declares `coq >= 8.14`, `coq-ext-lib >= 0.11.1`, `coq-paco >= 4.2.1` |
| `coq-paco` | **4.2.3** | `date:2025-01-30`, BSD-3-Clause, Hur/Neis/Dreyer/Vafeiadis/Cho |
| `coq-ext-lib` | **0.13.1** | pulled as a dependency, not a declared root |
| `ocaml` / `ocaml-base-compiler` | **4.14.4** | pinned conservatively on purpose — `roots.txt` says ecosystem compatibility is worth more here than a current OCaml |
| `dune` | 3.23.1 | |
| `ocamlfind` | 1.9.8 | |
| `zarith` | 1.14 | |

`roots.txt` declares six roots (`ocaml-base-compiler.4.14.4`, `dune`, `rocq-core>=9`,
`rocq-stdlib`, `coq-paco`, `coq-itree>=5.2.1`) and records *why* the lower bounds are there:
solved unbounded, the solver picks Coq 8.13.2 and `coq-itree` then fails to compile, because the
library's declared lower bound is looser than what it really builds on. That note is worth
keeping — it is the kind of fact a re-solve would rediscover the hard way.

## 1.3 Both cheap targets run green

`mise run smoke` compiles [`smoke/Smoke.v`](../../annex/coq/smoke/Smoke.v) in **0.6 s wall**. Its
output is the acceptance evidence:

```
paco1      : forall T0 : Type, (rel1 T0 -> rel1 T0) -> rel1 T0 -> rel1 T0
upaco1     : forall T0 : Type, (rel1 T0 -> rel1 T0) -> rel1 T0 -> T0 -> Prop
@ITree.bind : forall (E : Type -> Type) (T U : Type),
              itree E T -> (T -> itree E U) -> itree E U
@ITree.iter : forall (E : Type -> Type) (R I : Type),
              (I -> itree E (I + R)) -> I -> itree E R
```

Both lane libraries load and expose the names the technique is read through. `rocq compile` exits
0. This is the whole of what the annex currently proves about itself, and it is enough.

## 1.4 The finding: the sources are already here, checksum-pinned

The task brief assumed a pinned InteractionTrees study clone exists only on the Windows host
(`.reference/clones/InteractionTrees`). Confirmed absent on this Mac —
**`.reference/clones/` does not exist here**, and `.reference/papers/` contains only a
`README.md`, so none of the 19 PDFs listed in the prior report's §7.1 are on this host either.

But the clone is not needed to read the library. The opam package ships its `.v` sources:

```
annex/coq/.opamroot/estate/lib/coq/user-contrib/ITree/   68 .v files, 68 .vo, 8.8 MB
annex/coq/.opamroot/estate/lib/coq/user-contrib/Paco/    9.5 MB
annex/coq/.opamroot/estate/lib/coq/user-contrib/ExtLib/  3.4 MB
```

The module tree is the whole library: `Core/{ITreeDefinition,ITreeMonad,KTree,KTreeFacts,Subevent}`,
`Interp/{Interp,InterpFacts,Handler,HandlerFacts,Recursion,RecursionFacts,Traces,TranslateFacts}`,
`Eq/{Eqit,UpToTaus,SimUpToTaus,Rutt,RuttFacts,Paco2,Shallow,EqAxiom,EuttExtras}`,
`Events/{State,Reader,Writer,Exception,Map,MapDefault,Nondeterminism,Concurrency,Dependent}`,
`Props/{Finite,Infinite,Cofinite,Leaf,EuttNoRet,HasPost}`, `Basics/` (the category-theory layer),
`Axioms.v`, `Simple.v`.

**Pin discipline, answered:** it is already in place, one level stronger than a clone.
`switch.export` records the upstream tarball and its checksum:

```
url {
  src: "https://github.com/DeepSpec/InteractionTrees/archive/5.2.1.tar.gz"
  checksum: "sha512=8027de84ad96c89887051e2df4d8e68cac87389d353936a5f56f4910277d2e78fdd3447d8ce6b0704ecda8880692392cf9331f529de516d0e7ee6918aea3f8a5"
}
```

So the annex's source provenance is a committed sha512 over a named upstream release, replayed by
`mise run init`. A study clone would be *weaker* provenance than what the annex already has. My
recommendation: **do not clone InteractionTrees on this Mac.** Read
`.opamroot/estate/lib/coq/user-contrib/ITree/**/*.v` directly and cite `coq-itree 5.2.1` plus the
lock's checksum. If a future need requires upstream `master` or the `tutorial/` and `extra/`
directories (which the opam package does **not** ship — no tutorial, no `Secure/`, no `Dijkstra/`,
no `ITrace/` here), that is the moment to clone, shallow and gitignored, pinned by commit in
`REFERENCES.md`, matching the Windows-side convention.

**Citation note for anyone extending the prior report.** `.staging/explore/itrees-capabilities.md`
cites line numbers against the Windows clone at HEAD `68b3568d`. This report cites
`coq-itree 5.2.1` as installed. Line numbers differ between the two; where I give `file:line` it
is against the pinned 5.2.1 sources on this Mac, and I say so.

---

# 2. The technique, mapped to the lab's programs

Organized by what the lab is building, not by the library's table of contents. The prior report
covers the codatatype, the `translate`/`interp` split, and the equivalence family
(`itrees-capabilities.md` §§1.1–1.4); I cite it and go to the parts it left open — which of these
the lab's programs actually need.

## 2.1 (a) Recursion

### The mechanism, at the pin

`iter` is the general-recursion combinator, and its definition is one line
(`ITree/Core/ITreeDefinition.v:192-194`):

```coq
Definition iter {E : Type -> Type} {R I: Type}
           (step : I -> itree E (I + R)) : I -> itree E R :=
  cofix iter_ i := bind (step i) (fun lr => on_left lr l (Tau (iter_ l))).
```

**Read the `Tau`.** It is not decoration. Coq's guardedness checker accepts a `cofix` only when
every corecursive call sits under a constructor; `Tau (iter_ l)` is that constructor. The `Tau`
node *is* the productivity guard. This is the single most transferable idea in the whole
technique, and it is worth stating in the lab's own terms: **a silent step is what converts an
unrestricted recursive equation into a total definition.** Everything else about ITrees is
downstream of that trade.

`iter` is not ITree-specific; it is a class (`ITree/Basics/Basics.v:92-93`):

```coq
Polymorphic Class MonadIter (M : Type -> Type) : Type :=
  iter : forall {R I: Type}, (I -> M (I + R)%type) -> I -> M R.
```

with instances lifting it through `stateT`, `readerT`, `optionT`, and `eitherT`
(`Basics.v:104-150`). The `optionT`/`eitherT` instances matter for §2.2 — they are exactly the
carriers a typed-failure codec interprets into.

`mrec` turns *mutual* recursion into event handling (`ITree/Interp/Recursion.v:69-88`):

```coq
Definition interp_mrec {D E : Type -> Type}
           (ctx : D ~> itree (D +' E)) : itree (D +' E) ~> itree E :=
  fun R => ITree.iter (fun t : itree (D +' E) R =>
      match observe t with
      | RetF r        => Ret (inr r)
      | TauF t        => Ret (inl t)
      | VisF (inl1 d) k => Ret (inl (ctx _ d >>= k))
      | VisF (inr1 e) k => Vis e (fun x => Ret (inl (k x)))
      end).

Definition mrec {D E : Type -> Type}
           (ctx : D ~> itree (D +' E)) : D ~> itree E :=
  fun R d => interp_mrec ctx (ctx _ d).
```

The single-function case is `rec` over a one-constructor signature
(`Recursion.v:116-158`): `Inductive callE (A B : Type) : Type -> Type := Call : A -> callE A B B`,
and `call a := ITree.trigger (inl1 (Call a))`. The library's own comment at `Recursion.v:61-63` is
the honest framing: the result stays in the itree monad *"because [mrec] doesn't care whether the
mutually recursive definition is well-founded."* You do not get termination; you get a total
object that represents possible non-termination.

The Kleisli layer is `Notation ktree E := (Kleisli (itree E))` (`ITree/Core/KTree.v:24`), with the
file's comment declaring the structure: *"[ktree E] forms an iterative category, i.e. a cocartesian
category with a loop operator"*, and `loop : ktree (I + A) (I + B) -> ktree A B` drawn as literal
circuit-closing (`KTree.v:47-66`). That is the algebra the ITrees paper's compiler proof reasons
in — control-flow graphs as arrows, `loop` as the trace operator.

### (i) The entity store's mu-binder over FINITE schema carriers — **coinduction is not needed, and ITrees are irrelevant here**

This is the honest verdict the brief asked for, and I measured it rather than asserted it.

The kickoff's carrier (`entity-store-kickoff.md:284-295`) is an **inductive** Lean type. Its `mu`
constructor is `mu (discriminator : String) (body : SchemaCore)` — a binder inside a finite syntax
tree, with `var (i : Nat)` de Bruijn occurrences. The value universe
(`entity-store-kickoff.md:271-274`, §4.5 at `:225-232`) is likewise finite and inductive:
`null | bool | int | str | arr | obj`, explicitly no cycles, no identity, no floating point.

Nothing in that program is a coinductive object:

- **Identity is on the carrier, not the unfolding.** The address is
  `SHA3-512(version-byte ++ kind-tag ++ encodeS (canonS s))` (`:300-302`). `encodeS` serializes
  the finite term. The infinite unfolding of `mu X. F[X]` is a semantic shadow that the identity
  layer never touches. This is exactly Hook A of the prior report
  (`itrees-capabilities.md:654-664`) — hash presentations, not denotations — and the entity store
  already obeys it by construction.
- **The equivalence is structural.** §4.3's table (`:200-209`) gives `mu / var` the clause
  *"alpha-invariant in the binder, discriminator identity-bearing; de Bruijn"*. Alpha-invariance
  on a finite term is decidable syntax. It is not bisimulation, and the whole §3 apparatus of
  `itrees-capabilities.md` — undecidability above finite state, Ackermann-completeness for
  pushdown, `eutt` having no decision procedure — never arises, because the question never gets
  asked.
- **The conformance judgment is a terminating recursion on the value.** I checked this on the
  estate's own toolchain rather than reasoning about it. Part 2 of
  [`rocq-itrees-lean-probe.lean`](rocq-itrees-lean-probe.lean) defines `SchemaCore` with `mu`/`var`,
  a capture-avoiding-free `subst` for the unfold, and `Conforms`, on Lean 4.33.1, no Mathlib:

  ```lean
  termination_by fuel _ v => (fuel, sizeOf v)
  ```

  Lexicographic: the `mu`-unfold charges the first component, structural descent into the value
  charges the second. It elaborates, it is total and decidable, `#eval` runs it
  (`Conforms 8 (mu "nested" (array (var 0))) (arr [arr [], arr [arr []]]) = true`), and
  `#print axioms Conforms` reports `[propext, Classical.choice, Quot.sound]` — inside the estate's
  allowlist, `Classical.choice` arriving only through the well-founded-recursion machinery.

  Honest limitation of that probe: I used an explicit fuel budget for the unfold, which is sound
  but complete only for fuel at least the number of `mu`-unfolds along the deepest path
  (bounded by `size s * sizeOf v`). The principled form drops the fuel by requiring the `mu` body
  to be **guarded** — every `var` occurrence under at least one value-consuming constructor —
  which makes the value strictly decrease between consecutive unfolds. That side condition is
  already anticipated in the estate's own vocabulary: the reference sweep's `SchemaWF` at
  `effect-operational-semantics-reference-sweep.md:46` reserves *"recursive nodes, when later
  admitted, satisfy an explicit guardedness/productivity condition."*

One corroboration from the library itself, since it makes the same distinction. `ITree/Props/Finite.v`
defines finiteness of an interaction tree as an **`Inductive`** predicate over the coinductive
carrier — `all_finite` ("finite along all branches") and `any_finite` ("admits a finite branch"),
`Finite.v:36-50`. The library's own posture is that where the object of interest is finite, the
reasoning is inductive, and the coinductive carrier is just the ambient type. The entity store's
carriers are finite *by construction*, so it never needs the ambient type at all.

**So the transfer to the entity store is one idea, not one library.** The idea is guardedness —
the same condition ITrees' `Tau` enforces coinductively, the entity store needs inductively, as a
well-formedness predicate on `mu` bodies. Recommendation for ruling R-3: make contractiveness of
the `mu` body an admission condition in `Accept`, cite `iter`'s `Tau` guard
(`ITreeDefinition.v:192-194`) as the prior art that names the condition, and take nothing else.
Pulling in an ITree carrier for the entity store would be pure overbuy: it would replace a
decidable structural equality with an undecidable bisimulation, which is precisely the failure
mode `itrees-capabilities.md` §3.5 documents the whole content-addressing field avoiding.

### (ii) The runtime lane's divergence/iteration story — **here ITrees genuinely bind**

The runtime document's tier table (`effect-runtime-ground-truth-extraction-scope.md:404-419`) is
where the technique earns its place, and the document already says so at `:372-377`:
*"Once requests or scheduling are visible, replace equality of final outcomes by a parameterized
trace relation. Interaction Trees are a good deterministic event denotation."*

Reading the tiers against what ITrees supply:

| Tier | What it adds | Does it force a coinductive denotation? |
|---|---|---|
| T0 | closed descriptor, named total callbacks, `succeed`/typed `fail` | **No.** Finite, total. `denote : Eff A E Empty -> ExitPure A E` (`:330-331`) is a plain function |
| T1 | `flatMap`/`catchFail` + defunctionalized frames | **No.** The document's own required theorem 3 is *"the finite machine has progress and terminates"* (`:365`) |
| T2 | `Cause`, `Die`/`Interrupt`, `sync`/`suspend` | No — still terminating; `suspend` is a thunk, not a loop |
| T3 | service requests and `provide` | **First real pull, but for `interp`, not for coinduction.** See §2.2 |
| T4 | `OnExit`, interruption masks, scopes/finalizers | No, if scopes are finite |
| **T5** | `yieldNow`, callback suspension, abstract scheduler | **Yes — this is the first tier that forces it.** Suspension means a computation that may never resume; the observation becomes a trace, possibly infinite |
| T6 | child fibers, fork/await/join/race | Yes, and additionally forces *nondeterminism* — see §2.4 |
| T7 | tracing, metrics, cost | orthogonal |

**The line falls between T4 and T5.** Everything up to and including T4 has a finite, total direct
denotation; the conditional theorem envelope at `:381-398` says so explicitly, listing
*"divergence, scheduling, allocation, and wall-clock cost are outside the observation"* among its
conditions. T5 is where that exclusion has to be retired, because `yieldNow` plus an abstract
scheduler is exactly a loop whose termination is not a theorem you get to prove.

What ITrees offer at T5, concretely: `spin := Tau spin` (`ITreeDefinition.v:217`) is a
*well-defined inhabitant* of the semantic domain rather than a missing one, and `eutt` admits only
**finitely many** `Tau` insertions, so `spin` is not `eutt`-equal to any `Ret r`. Divergence is
observable. That is what makes the ITrees compiler proof termination-*sensitive*, and it is exactly
the granularity the runtime lane will need if it ever wants to claim "this transformation did not
turn a terminating Effect program into a hanging one."

## 2.2 (b) Higher-order transforms

### The mechanism, at the pin

Two morphisms, and the difference between them is the whole design.

**`translate`** (`ITree/Interp/Interp.v:60-70`) renames events and touches nothing else:

```coq
Definition translateF {E F R} (h : E ~> F) (rec : itree E R -> itree F R) (t : itreeF E R _) : itree F R :=
  match t with
  | RetF x   => Ret x
  | TauF t   => Tau (rec t)
  | VisF e k => Vis (h _ e) (fun x => rec (k x))
  end.
Definition translate {E F} (h : E ~> F) : itree E ~> itree F
  := fun R => cofix translate_ t := translateF h translate_ (observe t).
```

The file's own comment (`Interp.v:1-8`) records why both exist: `translate h t ≈ interp (trigger ∘ h) t`,
*"However this definition of [translate] yields strong bisimulations more often than [interp]"* —
i.e. `translate (id_ E) t ≅ id_ (itree E)` up to **strong** bisimulation, which `interp` cannot
give you. When the transform is a pure renaming, use the one that preserves the finer equivalence.

**`interp`** (`Interp.v:78-88`) is the workhorse:

```coq
Definition interp {E M : Type -> Type}
           {FM : Functor M} {MM : Monad M} {IM : MonadIter M}
           (h : E ~> M) : itree E ~> M := fun R =>
  iter (fun t =>
    match observe t with
    | RetF r   => ret (inr r)
    | TauF t   => ret (inl t)
    | VisF e k => fmap (fun x => inl (k x)) (h _ e)
    end).
```

Three things to read off it. It is defined *by* `iter`, not by `cofix`. Its only requirement on
the target is `MonadIter M` — "you can interpret into anything that can loop." And the result is a
**monad morphism**, which is what makes `interp h (x <- t ;; k x)` decompose and therefore what
makes equational rewriting about effectful programs possible at all.

### Effectful codecs with typed failure

This is the shape the lab actually wants, and the library ships it
(`ITree/Events/Exception.v:10-18`):

```coq
Variant exceptE (Err : Type) : Type -> Type :=
| Throw : Err -> exceptE Err void.

Definition throw {Err} {E} `{exceptE Err -< E} {X} (e : Err) : itree E X
  := vis (Throw e) (fun v : void => match v with end).
```

The answer type is `void`, so a throw has *no continuation* and can be given any result type. The
handlers `try_catch` and `throw_prefix` (`Exception.v:20-47`) are both written with `ITree.iter`,
and `throw_prefix : itree (exceptE Err +' E) R -> itree (exceptE Err +' E) (R + Err)` is literally
the reification of typed failure into a sum — the `Outcome A E` of the reference sweep
(`effect-operational-semantics-reference-sweep.md:38`), obtained by interpretation rather than
baked into the carrier.

Mapped onto Effect Schema's `decode`/`encode`: the reference sweep's
`decode : SchemaCore → JsonValue → Outcome DomainValue DecodeIssue` (`:51`) is the *already
interpreted* form. The ITree form would be `decode : SchemaCore → JsonValue → itree (issueE +' E) DomainValue`,
with `interp` into `eitherT DecodeIssue` recovering the sweep's signature — the `MonadIter_eitherT`
instance at `Basics.v:143` is exactly that target. What you buy by taking the detour: the issue
*policy* (first-failure vs. accumulate-all, issue ordering — an open question the sweep flags at
`:236` and the kickoff inherits) becomes a **handler you swap**, with one correctness lemma each,
rather than a decision welded into `decode`'s type.

That is a genuine architectural offer, and I want to be honest about its price for v1: the
kickoff's census consequences (`entity-store-kickoff.md:503-513`) **reject all encodings in v1**
— "v1 admission fails closed on any `encoding`, `encodingChecks`, or `constructorDefault` (all
closure-bearing)" — and note the pleasant corollary that "with no encodings admitted, the Type and
Encoded views coincide on the admitted subset, and ruling R-6 dissolves for v1." **With no
transformations admitted there is no effectful codec in v1 to model.** The `interp` offer is real
and it is dated: it becomes live exactly when named transformations enter, which the census marks
as gated on `SchemaGetter` being read upstream and on named transformations existing at all.

### Layered handlers, and what the store's named-transformations extension would inherit

Handlers form a category in their own right — `Handler E F := E ~> itree F` with identity
`ITree.trigger`, composition `cat`, and coproduct case analysis `case_`/`inl_`/`inr_`
(`ITree/Interp/Handler.v`; the prior report gives the line numbers at
`itrees-capabilities.md:121-126`). Two handler equalities exist, `eq_Handler` and `eutt_Handler`,
pointwise strong and weak. The event sum `E +' F` (`ITree/Indexed/Sum.v`) plus the `Subevent`
injection (`ITree/Core/Subevent.v`) let a program written against `E` run in a larger universe.

For the kickoff's §4.6 sense 3 — "effect computations as entities", the L2→L3 horizon at
`entity-store-kickoff.md:242-246` — the structural offer is precise and worth naming now, because
§4.6 says "nothing in v1 may preclude it":

> An event signature is **data**. `E +' F` is a sum of descriptions. A handler is a value in a
> category with identity and composition. So "effect descriptors as entities" is not a metaphor
> in this setting — the descriptor, the signature it is written against, and the handler that
> interprets it are three separately addressable objects, and handler composition is an operation
> on addresses.

The caveat that keeps this honest: ITrees are **first-order in their events**. Higher-order
effects do not fit — that is the diagnosis behind Guarded Interaction Trees (Frumin/Timany/Birkedal,
POPL 2024; `itrees-capabilities.md:298-307`), which needs Iris and guarded type theory to solve the
recursive domain equation. If the lab's L4 "protocols of protocols" ever requires an effect whose
*payload* is a computation, plain ITrees will not carry it, and the honest options at that point
are the gitrees line or the HITrees defunctionalization, not a bigger ITree.

## 2.3 (c) Equivalences — statement shapes, and which candidate theorems need them

The whole family is one relation transformer with two booleans (`ITree/Eq/Eqit.v:90-151`):

| Definition | `b1 b2` | Line | Meaning |
|---|---|---|---|
| `eq_itree RR` | `false false` | `Eqit.v:147` | strong bisimulation; `Tau`s match one-for-one |
| `eutt RR` | `true true` | `Eqit.v:149` | weak bisimulation, finitely many `Tau`s insertable either side |
| `euttge RR` | `true false` | `Eqit.v:151` | one-sided; a refinement preorder |

Plus `Rutt` (`Eq/Rutt.v`, `RuttFacts.v`) — relational up-to-tau across **different event
signatures** related by a relation. That is the cross-language shape, and it is the one a
"Lean model vs. pinned Effect" statement would want if it were ever stated bisimulationally.

The coinduction is done with paco, not `CoInductive`: `eqit := paco2 (eqit_ b1 b2 id) bot2`
(`Eqit.v:139-141`). The prior report's §2.1 makes the key point and I will not repeat it beyond
one line: **the ergonomics are a gpaco result, not an ITree result** — up-to closures are what
recover `rewrite`, `reflexivity`, and `symmetry` under a coinductive hypothesis.

**The statement shape.** The canonical form a verification project writes is:

```
eutt RR (denote_src s) (interp h (denote_tgt (compile s)))
```

— source denotation weakly bisimilar, under a result relation `RR`, to the interpreted denotation
of the compiled target. Jasmin uses equivalence up-to-tau *as its definition of compiler
correctness* (`itrees-capabilities.md:276`); Vellvm relates a semantic model to an extracted
reference interpreter the same way (`:272`).

**Which of the lab's candidate theorems would need this?** Reading the reference sweep's nine
theorem families (`:68-79`) and the kickoff's spine (`:307-325`):

| Family | Needs bisimulation? |
|---|---|
| WF preservation, progress, determinism, normalization, codec laws, equational laws, coherence (sweep 1–7) | **No.** These are statements about finite values and total functions. Equality, not bisimulation |
| Entity-store spine F1–F3, WF, S1–S3, D2–D3, V1–V3, K1–K2, A1–A2, ST1–ST4, NEG (kickoff §5) | **No.** Every one is about finite carriers, injective encodings, and a digest. Not one needs a coinductive relation |
| Sweep 8, semantic preservation (`p refines q := Traces(p) ⊆ Traces(q)`, `:62-64`) | **Only above T4.** Below it, traces are finite and inclusion is an inductive statement |
| Sweep 9, trace properties / liveness (`:78`) | **Yes**, and the sweep already defers it: *"liveness claims require an explicit infinite-trace or fairness model and are deferred from the first slice"* |
| Runtime machine-direct agreement (`runtime…:360-370`, theorem 5) | **No at T0/T1** — it is equality of `ExitPure` for a terminating machine |

The sweep's own orientation (`:62-66`) is trace inclusion, not bisimulation, and it says why: trace
inclusion is *"the safer default for nondeterminism, host choice, partial specifications, and later
concurrency."* Worth noting the technical difference, because it is not cosmetic: **trace
inclusion is coarser than `eutt`**, and in particular finite-trace inclusion does not distinguish
divergence from silence. If the runtime lane later wants divergence-sensitivity, it must either
move to `eutt`/`euttge` or add explicit divergence to the observation alphabet. That is a ruling
the lane will have to make, and it does not have to make it before T5.

## 2.4 (d) Choice Trees, briefly

ITrees model nondeterminism only by pushing it into a handler — `interp` into a set- or
prop-valued monad — and the ctrees paper's diagnosis is that this is awkward precisely where the
lab would need it: schedulers and concurrency. CTrees add explicit branching nodes alongside
external events, supporting a shallow embedding of internal choice while recovering an inductive
LTS view (Chappe, He, Henrio, Zakowski, Zdancewic, POPL 2023, DOI
[10.1145/3571254](https://doi.org/10.1145/3571254), [arXiv:2211.06863](https://arxiv.org/abs/2211.06863);
summarized at `itrees-capabilities.md:289-296`).

For the lab this maps cleanly onto the tier table, and the runtime document already says so at
`:766-767`: *"Choice Trees separate internal and external nondeterminism. Use their distinction
when scheduler choice enters T6."* I agree with that placement with one refinement: the
**T5/T6 boundary** is the right trigger, not T6 alone — T5's "deterministic abstract scheduler"
(`:413`) is deliberately deterministic, so ITrees suffice there; the moment the scheduler becomes
a choice rather than a parameter, ITrees stop being the right object.

Note also `ITree/Events/Nondeterminism.v` and `ITree/Events/Concurrency.v` ship in the annex at
the pin, so the ITree-native (handler-based) approach is readable locally for comparison before
reaching for ctrees. `coq-ctree` is **not** in the switch; adding it would mean editing
`roots.txt`, deleting `switch.export`, re-running `init`, and committing the new lock with a
reason — the documented procedure at `annex/coq/README.md:51-56`. I do not recommend doing that
now; see §4.

---

# 3. The Lean 4 realization question

**Result, stated first: the coinduction obstacle in Lean 4 is real but it is not where the prior
report placed it, and it is smaller than the ecosystem survey suggests. Under a container
presentation of the event signature — which the estate's own fail-closed discipline already
forces — the interaction-tree carrier, `corec`, `observe`, `bind`, `iter`, `translate`, `interp`,
typed-failure `throw`, and the whole `eq_itree`/`eutt`/`euttge` equivalence family build in Lean
4.33.1, with no Mathlib and no imports at all, in 413 lines elaborating in 0.6 s, with an axiom
profile strictly inside the estate's allowlist and most of it axiom-free. I measured this; I did
not infer it. What is *not* measured is the equational theory — see §3.3 and gap 5.**

## 3.1 First: the axiom question is a non-issue, and that was not obvious

The Coq library declares its ambient classical toolkit in one file, `ITree/Axioms.v:1-35`:
`Logic.Classical_Prop` (`classic`), `Logic.ClassicalChoice` (`choice`), `Logic.EqdepFacts`
(`eq_rect_eq`, i.e. **UIP**), `Logic.FunctionalExtensionality`. The prior report's "Paid" column
(`itrees-capabilities.md:224-241`) reads these as costs, and in Coq they are.

In Lean 4 they are not. Measured on Lean 4.33.1 (`#print axioms` output, run this session):

| Coq ITree axiom | Lean 4.33.1 status | Measured axiom profile |
|---|---|---|
| UIP / `eq_rect_eq` | **theorem, by `rfl`** — `Eq` is a `Prop` and the kernel has definitional proof irrelevance | *"does not depend on any axioms"* |
| dependent `Vis` inversion (transport along an event-type equality) | **theorem** | *"does not depend on any axioms"* |
| `functional_extensionality` | theorem | `[Quot.sound]` |
| `classic` (excluded middle) | `Classical.em` | `[propext, Classical.choice, Quot.sound]` |
| `choice` (AC for relations) | theorem from `Classical.choice` | `[Classical.choice]` |

Every one lands inside the estate's allowlist `{propext, Classical.choice, Quot.sound}`
(`formal/fips202/README.md:49`, `PASSA-CONTRACT.md:24`), and the UIP row lands **below** it.

This deserves emphasis because it inverts a plausible worry. The single axiom the ITrees README
flags as needed for the `eutt (Vis e k1) (Vis e k2) -> forall x, eutt eq (k1 x) (k2 x)` inversion
lemma — the one place the library is not axiom-free — **evaporates in Lean**, because Lean's
kernel has proof irrelevance where Coq's does not. The migration is favourable on axioms, not
unfavourable. Judgment: this is the most useful single fact in this report for anyone who assumed
the trust profile was the obstacle. It is not. The obstacle is entirely constructional.

## 3.2 The real obstacle, isolated: a universe jump, not a missing feature

Lean 4 has no `coinductive` command. But the specific thing that blocks a naive port is narrower
and I measured it. Transcribing the Coq base functor literally:

```lean
inductive ITreeF (E : Type → Type) (R : Type) (X : Type) : Type 1 where
  | ret (r : R)
  | tau (t : X)
  | vis {A : Type} (e : E A) (k : A → X)
```

Lean accepts this and reports `ITreeF : (Type → Type) → Type → Type → Type 1`. **The base functor
leaves `Type` for `Type 1`**, because `vis` existentially quantifies over `A : Type`. So
`ITreeF E R` is not an endofunctor on `Type`, and every fixpoint construction — M-types, QPF,
hand-rolled towers — needs an endofunctor. Coq tolerates the same declaration via template
polymorphism; Lean's universe discipline does not.

This is, I believe, the precise content of the blocker the dormant `boogie-org/lean-itrees` spike
recorded as *"lack of universe polymorphism prevents implementing `interp`"*
(`itrees-capabilities.md:329`). It is not that Lean lacks coinduction; it is that
`E : Type -> Type` with an existential over `Type` in a constructor is not portable.

**The fix is to present the event signature as a container** — a code type plus an answer-type
family:

```lean
structure Sig where
  Op  : Type
  Ans : Op → Type

inductive ITreeF (S : Sig) (R : Type) (X : Type) : Type where
  | ret (r : R)
  | tau (t : X)
  | vis (e : S.Op) (k : S.Ans e → X)
```

Measured: `ITreeF : Sig → Type → Type → Type`. The universe jump is gone; it is an endofunctor on
`Type`.

**And this is the trade the estate wants anyway.** A container-presented signature is exactly "a
closed, enumerable, serializable vocabulary of event codes" — which is:

- the kickoff's §4.1 ruling, *"Schema Core admits no functions"*, refinements entering as members
  of a closed serializable check vocabulary, everything else rejected fail-closed
  (`entity-store-kickoff.md:167-174`);
- the runtime document's admission move, `PureK` *"must be syntax or a closed table of named
  blocks, not an arbitrary Lean or JavaScript function… This makes well-formed programs
  enumerable, serializable, content-addressable"* (`runtime…:315-318`);
- the property the kickoff says E2 is built on (`:84-88`).

So the estate's fail-closed discipline **deletes the exact feature that makes ITrees hard to port
to Lean**. That is a real alignment and not a coincidence: both are refusals of arbitrary
functions in a position where you need to enumerate, serialize, or take a fixpoint.

The cost of the restriction, stated honestly: with events as a container you lose the ability to
have an event whose answer type is chosen from all of `Type` at each node. Every event answer must
be `S.Ans e` for a code `e` in a small type. Programs that need genuinely open-ended answer types
— a `Vis` returning an arbitrary type parameter supplied by the client — cannot be written. For
the lab's programs, whose entire admission discipline is "no open-ended anything", this costs
nothing I can identify.

## 3.3 What actually builds: the measurement

Companion file: [`rocq-itrees-lean-probe.lean`](rocq-itrees-lean-probe.lean), 413 lines, staged,
not an artifact, banner says so. Toolchain: Lean **4.33.1**
(`arm64-apple-darwin24.6.0`, commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`) — the estate's
floor. **No Mathlib, no Lake project, no imports at all.** Whole-file elaboration: **0.63 s wall**.

Built and checked (`#print axioms` output is in the file):

| Construction | Notes | `#print axioms` |
|---|---|---|
| `Approx : Nat → Type`, `trunc` | the finite-approximation tower | — |
| `ITree` as coherent towers | `structure ITree where approx : ∀ n, Approx S R n; coh : ∀ n, trunc n (approx (n+1)) = approx n` | — |
| `corec` | the corecursor; universal property of the final coalgebra | `[Quot.sound]` |
| `spin` | infinite `Tau`s as a total inhabitant | `[Quot.sound]` |
| **`observe`** | one-step forcing, all three cases including the dependent `vis` transport | **no axioms** |
| `bind` | monadic bind, by corecursion on a sum-typed state | `[Quot.sound]` |
| `iter` | with the `.tau` productivity guard, mirroring `ITreeDefinition.v:192` | `[Quot.sound]` |
| `translate` | over a container morphism `SigMor` | `[Quot.sound]` |
| **`interp`** | handler `(e : S.Op) → ITree S' (S.Ans e)`, built from `iter` and `map` | `[Quot.sound]` |
| `throw` over `failSig Err := {Op := Err, Ans := fun _ => Empty}` | typed failure as an event, `Empty` answer | `[Quot.sound]` |
| `gfp`, `gfp_coind`, `gfp_unfold` | Knaster–Tarski greatest fixpoint via impredicative `Prop` | **no axioms** |
| `EqitF b1 b2 sim` | the five-constructor inductive stratum, transcribed from `Eq/Eqit.v:90-141`, `sim` strictly positive | — |
| **`eqItree` / `eutt` / `euttge`** | the whole two-boolean family, `Eqit.v:147/149/151`, as `gfp (eqitG b1 b2)` | **no axioms** |
| `EqitF_mono`, `eqitG_mono` | monotonicity — the side condition `gfp_unfold` needs | **no axioms** |
| `eutt_coind`, `eutt_unfold` | coinduction principle and unfolding, specialised | **no axioms** |
| `eqit` (an earlier, direct strong-bisimulation instance) | kept as the minimal illustration | `[propext]` |

Three of these deserve comment.

**`observe` is axiom-free, and it is the case that needs UIP in Coq.** Extracting the `vis`
continuation requires transporting along an equality of event codes; the probe discharges it with
`cases h; rfl`. In Coq this is the `dependent destruction` / `eq_rect_eq` path. The §3.1 finding
cashed out.

**`interp` builds.** This is the combinator `boogie-org/lean-itrees` reported as blocked. Under
the container presentation it is 8 lines. I am not claiming that spike was wrong — it was working
with `E : Type → Type` and QpfTypes, where the blocker is genuine. I am claiming the blocker is a
consequence of the presentation, and the estate does not need that presentation.

**The `eutt` definition transcribes, axiom-free.** This was the measurement I was least sure of
going in, because `eutt` is not a plain greatest fixpoint: the two `Tau`-stripping rules
(`EqTauL`/`EqTauR` at `Eqit.v:90-141`) are an *inductive* stratum nested inside the coinductive
one. In Lean that is an inductive family parameterized by the simulation relation, with `sim`
occurring strictly positively — Lean accepts it, and `gfp` over it gives `eqItree`, `eutt`, and
`euttge` by setting the two booleans, exactly as `Eqit.v:147-151` does. Monotonicity, the
coinduction principle, and the unfolding direction all check with **no axioms**.

**What the probe does *not* establish, stated plainly.** It builds the *carrier*, the
*combinators*, and the *definitions of the equivalences*. It does not build the **theory**: no
monad laws, no proof that `eutt` is transitive or an equivalence at all, no congruence of `bind`
under bisimulation, no proof that `interp` is a monad morphism or respects `eutt`, no up-to
techniques, no `paco`-style incremental coinduction, no `Rutt`. Those are where the Coq library's
bulk actually is — `Eq/Eqit.v` alone is **1575 lines** at the pin, and the `*Facts` modules exist
precisely because the laws are the hard part. Having a *definition* of `eutt` that elaborates is
worth much less than having `eutt` be usable, and the gap between the two is the gpaco layer.
My measurement bounds the *definitional* cost. It does not bound the *theory* cost. See §5.

## 3.4 The options, scored

Against the estate's discipline: pure kernel, allowlist `{propext, Classical.choice, Quot.sound}`,
no Mathlib by default, v4.33.1 floor
(`entity-store-kickoff.md:250-251`, `formal/fips202/PASSA-CONTRACT.md:24`).

### Option A — hand-rolled M-type over a container presentation

- **Maturity:** the *construction* is textbook (final coalgebras of container/polynomial functors);
  the *instance* is what I measured this session.
- **Dependency cost:** zero. No Mathlib, no imports, one file.
- **Axiom/trust profile:** measured `⊆ {propext, Quot.sound}`; `observe` and the coinduction
  principle axiom-free. Nothing silently imported.
- **What the estate could stamp G1 on:** the carrier, the combinators, and any law proved about
  them. All of it is lab-owned Lean definitions — precisely the G1 target.
- **What it would silently import:** nothing. That is the point, and it is the only option here
  for which I can say that from measurement rather than from reading a `lakefile`.
- **Effort class for the definitional layer:** measured — one session, 413 lines.
- **Effort class for the theory:** the honest unknown. Congruence, transitivity of `eutt`, monad
  laws, and up-to techniques are a multi-week to multi-month body of work and I have no local
  measurement bounding any of it. Judgment, marked as judgment: weeks for `eq_itree` congruence
  plus monad laws; **months** for a `eutt` that is usable rather than merely defined.

### Option B — QpfTypes (quotients of polynomial functors)

- The Avigad–Carneiro–Hudon lineage ("Data Types as Quotients of Polynomial Functors", ITP 2019)
  ported to Lean 4 as a `QpfTypes` package supplying a `codata` command.
- **Known local data point:** `boogie-org/lean-itrees` built on QpfTypes and stalled with three
  open blockers, `interp` unimplementable among them, after three days of activity in January 2025
  (`itrees-capabilities.md:329`, verified in the prior sweep).
- **NOT VERIFIED this session:** current repository state, last commit, which Lean toolchains it
  supports, whether the `codata` command works today, and — the question that would decide it —
  **whether it depends on Mathlib**. My strong expectation is that it does, through
  `Mathlib.Data.QPF.Multivariate`, since that is where the multivariate QPF theory lives; but I
  did not confirm it and it should not be treated as confirmed. A targeted sweep was dispatched
  and did not return before this report was written.
- **Judgment on fit, which does not depend on the unverified part:** even if healthy and even if
  Mathlib-free, it brings a package plus a `codata` elaborator into the trust story for a
  construction the estate can do in 413 axiom-clean lines with no imports. The estate's rule is
  "no Mathlib by default"; the same instinct applies to any dependency bought for a construction
  you can own outright. **Not recommended**, and the probe is the argument.

### Option C — Mathlib M-types (`Mathlib.Data.PFunctor.Univariate.M`, `QPF.Cofix`)

- Mathlib has M-types (`PFunctor.Univariate.M`) and QPF `Cofix`, and it is essentially the same
  construction the probe hand-rolls. **I did not open Mathlib this session** — no Mathlib is
  installed on this host and the estate does not use it — so the module paths above are from
  memory and should be checked before anyone relies on them. What is *not* in doubt is that the
  construction exists there; it is standard.
- **Dependency cost is the disqualifier**, not the mathematics. Pulling Mathlib into a `formal/`
  project contradicts the standing "no Mathlib by default" rule, adds a large build, and — the
  part that actually matters for the estate — makes the per-theorem axiom gate harder to reason
  about because the imported surface is enormous.
- One genuine advantage I will not pretend away: Mathlib's version comes **with theory**, which is
  exactly what §3.3 says my probe lacks. If the up-to-techniques layer (row 4 of §4.3) turned out
  to be intractable hand-rolled, this is the fallback worth revisiting rather than dismissing.
- **Judgment: not recommended now**, for the same reason as B. If the hand-rolled version had been
  hard, this would be the fallback. The definitional layer was not hard; the theory layer is
  unmeasured, so keep this option on the shelf rather than off it.

### Option D — fuel / step-indexed finite approximation

- **What survives finitization:** everything about terminating programs. Safety properties.
  Determinism. Progress. Preservation. Codec round trips. Machine-direct agreement at T0/T1.
  The runtime document's entire conditional theorem envelope (`runtime…:381-398`) is stated for a
  machine that *terminates*, so fuel costs it nothing.
- **What dies:** any statement that distinguishes divergence from "did not finish within the
  budget". Divergence-sensitivity dies first and most importantly — `spin` and `Ret r` become
  indistinguishable at every finite fuel, so termination-*sensitive* refinement is unstatable.
  Liveness and fairness die. Trace *equivalence* survives only up to the budget.
- **Where the first tier that FORCES coinduction is:** answered in §2.1(ii) — **T5**. T0–T4 are
  finite and total by the document's own theorem 3 (`:365`). Fuel is not merely adequate below
  T5, it is *free*, because there is nothing to lose.
- Note the ITree library itself ships the fuel operator — `Fixpoint burn (n : nat) {E R} (t : itree E R)`
  at `Core/ITreeDefinition.v:308` in the pinned 5.2.1 — and uses it for testing. Fuel and
  coinduction are complements in the original, not rivals.
- **Judgment: correct for everything the estate is actually building today**, and the honest
  default until T5.

### Option E — Lean's `partial_fixpoint` (Breitner's CCPO/`Lean.Order` machinery)

- **Measured present in v4.33.1.** `def loop (n : Nat) : Option Nat := if n = 0 then some 0 else loop (n-1) partial_fixpoint` elaborates,
  `Lean.Order.CCPO` resolves, and `#print axioms loop` reports
  `[propext, Classical.choice, Quot.sound]` — inside the allowlist.
- **What it gives:** a fixpoint for a monotone function into a domain with a least element,
  yielding partial functions in `Option`-like carriers, with a fixpoint equation for reasoning.
- **What it does not give:** an interaction tree. It produces the *result* of a possibly-diverging
  computation as a partial value; it does not produce an *event structure* you can interpret with
  handlers, and it has no bisimulation theory. Divergence is `none`, which is exactly the
  divergence-insensitivity of Option D.
- **Judgment:** a real and allowlist-clean tool for defining partial functions, orthogonal to
  ITrees. Worth knowing about; not a realization of the technique.

### Option F — port an existing Lean ITree development

Covered in §3.6, on the prior report's §2.4 plus this session's ecosystem sweep.

## 3.5 Scoring summary

| Option | Maturity | Deps | Axioms vs allowlist | G1-stampable? | Verdict |
|---|---|---|---|---|---|
| **A. hand-rolled container M-type** | construction textbook; definitional layer measured here, theory unmeasured | **none** | `⊆ {propext, Quot.sound}`, measured | **yes, entirely** | **the bet** |
| B. QpfTypes | **unverified this session** | package + `codata` elaborator; Mathlib dep suspected, unconfirmed | unverified | partly | not recommended |
| C. Mathlib M-types | mature (not inspected this session) | **Mathlib** | large surface | partly | not now; keep on the shelf as the theory-layer fallback |
| D. fuel / step-indexing | trivial | none | clean | yes | **correct today, through T4** |
| E. `partial_fixpoint` | shipped in 4.33.1, measured | none | `⊆ allowlist`, measured | yes | orthogonal tool |
| F. port an existing Lean ITree | see §3.6 | — | — | — | see §3.6 |

## 3.6 Existing Lean ITree ports and analogues

The prior report already surveyed this and verified each item directly
(`itrees-capabilities.md:322-337`). I do not re-derive it; I record it, and then say what my
measurements change about how to read it.

| Artifact | Status as the prior sweep observed it | What §3.2–3.3 changes |
|---|---|---|
| [`boogie-org/lean-itrees`](https://github.com/boogie-org/lean-itrees) | Apache-2.0, 26 KB, 4 commits, created 2025-01-10, last pushed 2025-01-13 — **three days of activity**. Built on QpfTypes. README "Next Up" lists three open blockers, the first being that **lack of universe polymorphism prevents implementing `interp`** | **The blocker is a consequence of the `E : Type → Type` presentation, not of Lean.** §3.2 shows the universe jump concretely (`ITreeF … : Type 1`), and §3.3 builds `interp` in 8 lines once events are a container. This does not resurrect the spike — it is still an abandoned 26 KB spike — but it reclassifies its blocker from "Lean can't" to "that encoding can't" |
| **HITrees** — Fadaei Ayyam & Sammler, [arXiv:2510.14558](https://arxiv.org/abs/2510.14558), Oct 2025 | The serious Lean 4 entry, and **a redesign, not a port**: *"the first variant of interaction trees to support higher-order effects in a non-guarded type theory."* Makes the tree **inductive**, shapes effects so fixpoints are ordinary inductive types, **defunctionalizes** higher-order outputs, and reasons via a **big-step relation `t ⇓ v`** instead of a bisimulation family | Still the most important design to read, and its first technique — *shaping effects so the fixpoint is expressible* — is the same instinct as the container presentation. But note the divergence: HITrees pays for its inductive carrier by **giving up the equivalence menagerie**, which is exactly what the runtime lane would want at T5. My probe suggests you may not have to make that trade if you are willing to restrict event answer types instead |
| [`hxrts/paco-lean`](https://github.com/hxrts/paco-lean) | Apache-2.0, 1 star, 320 KB, 57 commits, created 2026-01-07, last pushed 2026-01-16. Coq-paco naming aliases, gpaco with guards, up-to techniques, companion construction, eight docs. **Substantial in structure; brand-new, single-author, one star, no evidence of external use or review** | This is the one that maps onto my §4.3 row 4 — the up-to-techniques layer that is the actual risk. If it is real it would be the highest-leverage thing to evaluate; if it is not, that layer is months of original work. **I did not evaluate it**, and the prior sweep's verdict — *treat as unvetted* — stands unchanged |

**Verdict on Option F (port an existing development): no.** There is nothing to port. One
abandoned spike, one paper that deliberately abandons the coinductive formulation, and one
unvetted single-author coinduction library. The prior report's summary
(`itrees-capabilities.md:333-337`) is accurate and I found no reason to soften it.

What I would add to it is a narrower and more useful reading than "Lean is the weak link"
(Hook G, `:730-741`). The weak link is **not** the carrier and **not** the axioms — §3.1 and §3.3
measure both as cheap and clean. The weak link is the **up-to-techniques / gpaco layer**, which is
what makes coinductive proof incremental and therefore what makes the theory usable. That is a
sharper target than "Lean has no coinductive types", and it is the thing to go look at if the
option is ever taken up.

**One caveat on the table above.** All three rows are inherited from the prior sweep's
observations, dated to that sweep. I did not re-check repository activity, star counts, or
toolchain compatibility this session, and a targeted search for newer Lean ITree work was
dispatched but had not returned by the time this report was written. Treat the dates as of the
prior sweep, not as of today, and re-check before acting on any of them.

## 3.7 Local Lean study clones

Checked: **neither is on this Mac.** `.reference/clones/` does not exist on this host, and a
repo-wide search for `lean-crypto-hash` and `dregg` returns nothing outside `.claude/worktrees/`.
The only Lean code in the tree is `formal/fips202/` (the landed digest layer). I could not assess
their relevance and did not guess at it.

---

# 4. Sequencing verdict

## 4.1 Where ITrees would be overbought

**Entity store v1 — not needed. Say so plainly.** The carrier is finite and inductive
(`entity-store-kickoff.md:271-295`), the value universe is finite with no cycles (`:225-232`),
identity is a digest over a serialized finite term (`:300-302`), and the declared equivalence is
per-constructor structural (`:200-209`). Every theorem in the spine F1–NEG (`:307-325`) is about
finite objects. The `mu` binder needs **guardedness**, not coinduction — measured in §2.1(i).
Introducing an ITree carrier here would trade a decidable structural equality for an undecidable
bisimulation, which is the exact move `itrees-capabilities.md` §3.5 shows no content-addressing
system in the field makes. **Recommendation: take the guardedness condition, cite `iter`'s `Tau`
as prior art, take nothing else.**

**Runtime T0/T1 — direct denotation suffices, and fuel is free.** `denote : Eff A E Empty -> ExitPure A E`
(`runtime…:330-331`) is a total function into a two-constructor sum. Required theorem 3 is that
the machine *terminates* (`:365`). There is no divergence in the observation to preserve. An
ITree denotation at T0/T1 would add `Tau` bookkeeping and a bisimulation obligation in exchange
for nothing.

**T2–T4 — still no.** Causes, defects, `sync`/`suspend`, service lookup, finalizers, interruption
masks are all finite control. The one thing T3 pulls toward is `interp`-style layered handlers —
which is an *architectural* borrowing (build semantics as a stack of handlers, one correctness
lemma each) available without the coinductive carrier.

## 4.2 Where they genuinely bind

**T5 is the trigger.** `yieldNow`, callback suspension, and a scheduler mean a computation that
may never resume. That is the first point at which the observation must be a possibly-infinite
trace and divergence must be distinguishable from silence. ITrees are the right shape there:
`spin` is an inhabitant, `eutt` admits only finitely many `Tau`s, so divergence is observable and
refinement can be termination-sensitive.

**T6 escalates to ctrees.** Once the scheduler is a *choice* rather than a parameter, the ITree
answer (nondeterminism pushed into a handler) is the one the ctrees authors diagnosed as
inadequate. The runtime document's placement at `:766-767` is right; I would name the trigger as
"the scheduler becomes nondeterministic", which straddles T5/T6 rather than sitting inside T6.

**The effectful-codec horizon is real but dated.** §2.2 gives the offer: issue policy as a
swappable handler, `interp` into `eitherT`. The census closes it for v1 — no encodings admitted,
so no effectful codec exists to model (`entity-store-kickoff.md:503-513`). It reopens when named
transformations exist upstream.

## 4.3 Concrete recommendation

**Boundary rule, restated because this section is where it would be violated:** nothing below
produces an estate artifact from the annex. The annex is read; Lean is where anything the estate
keeps gets restated and reproved, with the Rocq original cited (`annex/coq/README.md:14-23`).

### Read and run in the annex now — small, bounded, zero-risk

The switch is already green and the sources are already local (§1.4). The reading list, in order,
all under `.opamroot/estate/lib/coq/user-contrib/ITree/`:

1. `Core/ITreeDefinition.v` (317 lines) — the codatatype, `observe`, `bind`, `iter:192`, `spin:217`.
   The one thing to extract is *why the `Tau` in `iter` is there*.
2. `Interp/Interp.v` (92 lines) — `translate:60` vs `interp:78`, and the comment at `:1-8` on why
   both exist.
3. `Interp/Recursion.v` (171 lines) — `interp_mrec:69`, `mrec:84`, `callE:116`, `rec:146`.
   Recursion as an interpreted event.
4. `Events/Exception.v` (47 lines) — typed failure as an event with a `void` answer;
   `throw_prefix:35` as the reification into a sum. Directly the codec shape.
5. `Basics/Basics.v:88-150` — `MonadIter` and the `optionT`/`eitherT` instances.
6. `Eq/Eqit.v:84-151` only — the two-boolean family. **Do not attempt the 1575-line file.**

Everything above is under 800 lines total. `mise run smoke` is the only command needed; add
`Check`s to a scratch `.v` file inside `annex/coq/` if you want to poke at signatures. No new opam
packages. **Do not add `coq-ctree`** until T5/T6 is actually live — it would mean editing
`roots.txt`, deleting `switch.export`, re-solving, and committing a new lock
(`annex/coq/README.md:51-56`), which is a real change to a green pinned toolchain for no current
return.

### Prototype in Lean — and the effort class, measured not guessed

The definitional prototype **is already done** and sits at
[`rocq-itrees-lean-probe.lean`](rocq-itrees-lean-probe.lean): 413 lines, 0.63 s, Lean 4.33.1, no
Mathlib, no imports, axioms inside the allowlist. Effort class for that step: **done, one
session.** Read the next paragraph before drawing any conclusion from that.

What I would prototype next, and only if the operator wants the option kept warm — this is
*optional*, because §4.1 says nothing on the current roadmap needs it:

| Step | Effort class | Why |
|---|---|---|
| Carrier, combinators, `interp`, and the `eqit`/`eutt`/`euttge` **definitions** | **done — measured, one session** | The companion probe. 413 lines, axioms `⊆ allowlist`, most of it axiom-free |
| `eutt` is an equivalence relation (reflexive, symmetric, **transitive**) | days–weeks; **transitivity is the first hard one** | Transitivity of a weak bisimulation is exactly the thing that is not free, and is the reason the up-to-transitivity closure exists in the first place |
| Monad laws for `bind` up to `eqit` (left/right identity, associativity) | days–weeks | The first real test of whether the `gfp` formulation is usable rather than merely well-typed |
| Up-to-transitivity / a paco-style companion so `rewrite` works under coinduction | **weeks–months, and this is the risk** | The prior report's §2.1 is explicit that ITree ergonomics are a **gpaco** result, not an ITree result. Without this the theory is present and practically unusable |
| `interp` is a monad morphism; `interp` respects `eutt` | weeks | The workhorse congruence result every compiler-style proof rewrites with |

Judgment on that ladder, and this is the part to weigh: **row 1 being cheap says almost nothing
about rows 2–5.** Definitions elaborating is not the same as a theory being workable, and the
distance between them is precisely what `Eq/Eqit.v`'s 1575 lines and the whole gpaco paper are
about. Rows 2–3 are a reasonable staged experiment if the operator wants the option kept warm.
**Row 4 is where a Lean ITree effort would actually succeed or fail**, and I have no measurement
bounding it. Nobody should commit to rows 4–5 on the strength of this report.

### Defer, with named trigger conditions

| Deferred | Trigger condition |
|---|---|
| Any ITree carrier in the entity store | **Never on the current design.** Only if the value universe admits cycles or the identity quotient becomes semantic rather than structural — both of which would be a different program |
| ITree denotation in the runtime lane | **T5 opens**: `yieldNow` / callback suspension enters the admitted surface, i.e. milestone M6 in `runtime…:700` |
| The `eutt` proof apparatus (rows 2–5 above) | Same T5 trigger, **plus** a decision that the lane wants divergence-sensitive refinement rather than finite-trace inclusion — the reference sweep currently declares trace inclusion as the orientation (`effect-operational-semantics-reference-sweep.md:62-66`) |
| Choice Trees / `coq-ctree` in the annex | The scheduler becomes nondeterministic (T5/T6 boundary) |
| Guarded Interaction Trees / higher-order effects | An effect whose payload is itself a computation — charter L4 territory, nothing before it |
| Effectful-codec modeling via `interp` | Named transformations exist upstream in Effect Schema; the census flags `SchemaGetter` as the unread surface that could change this (`entity-store-kickoff.md:513`) |

### One thing to do regardless

Add the ITrees pins to the reference ledger. `itrees-capabilities.md:799-804` records that
`REFERENCES.md` was not modified and the ITrees material is **unpinned**. On this Mac the annex's
`switch.export` now carries a sha512 for InteractionTrees 5.2.1 (§1.4), which is stronger
provenance than the Windows clone's HEAD — that fact belongs in the ledger. Judgment, not a
finding: this is cheap and it is the kind of bookkeeping that gets expensive later.

---

# 5. Honest gaps

**Local, could not verify:**

1. **The Xia 2022 dissertation was not read.** It is the estate's named semantic reference
   (`CHARTER.md:123-126`), and the prior report records retrieval failing —
   `poisson.chat/thesis.pdf` a live 404, ScholarlyCommons 403 (`itrees-capabilities.md:279`,
   `:786`). Nothing in §2 rests on it; everything cited there is either the pinned source in the
   annex or the POPL 2020 paper. Statements anywhere in the estate attributed to the dissertation
   are still unverified-by-direct-read.
2. **No paper PDFs on this Mac.** `.reference/papers/` holds only a `README.md`. Every paper
   citation in this report is inherited from `itrees-capabilities.md` §7 or from this session's
   web sweep, not from a local read.
3. **`.reference/clones/` does not exist here**, so I could not check the Lysxia study clones, and
   the local Lean study clones named in the brief (`lean-crypto-hash`, `dregg`) are not present
   either. §3.7 reports absence, not irrelevance.
4. **The annex ships no `tutorial/` or `extra/`.** The opam package installs `theories/` only —
   68 `.v` files. The ITrace theory, the Dijkstra monads, and the `Secure/` noninterference family
   that `itrees-capabilities.md:316-320` describes are **not** locally readable, and the axiom
   claims about them (excluded middle for divergence-detection) are inherited, not checked here.

**Measurement gaps — the important ones:**

5. **My Lean probe bounds the definitions, not the theory. This is the most important caveat in
   the report.** It builds carriers, combinators, and the equivalence *definitions*, and shows
   they elaborate with a clean axiom profile. It proves **no laws**: not that `eutt` is
   transitive, not the monad laws, not congruence of `bind`, not `interp`-is-a-monad-morphism,
   no up-to techniques. The Coq library's `Eq/Eqit.v` is 1575 lines at the pin and the `*Facts`
   modules exist because that is where the work is. **Anyone reading §3 as "ITrees in Lean are a
   solved 413-line problem" has misread it**, and I would rather be quoted on this sentence than
   on the line count. The claim is narrow and should stay narrow: the *definitional layer* is
   cheap and axiom-clean; the *equational theory* is unmeasured and is most of the value.
6. **The `gfp` bisimulation is the naive Knaster–Tarski form.** It gives the coinduction
   principle for free (measured, axiom-free) but nothing resembling paco's incrementality or
   gpaco's up-to closures. Whether that gap is bridgeable at reasonable cost in Lean is exactly
   what I could not determine, and it is the single largest unknown in the Lean-realization
   verdict. In particular I did not test whether the naive `gfp` form makes incremental proofs
   *painful* in the specific way the paco paper describes — that only shows up when you try to
   prove something real with it.
7. **The container restriction is untested against a real workload.** I argued in §3.2 that it
   costs the lab nothing because the estate's admission discipline already forbids open-ended
   functions. That argument is judgment. Nobody has written a real Effect-runtime denotation
   against a container-presented signature to find out what it actually pinches.

**Ecosystem gaps — two dispatched sweeps did not return:**

7b. **Options B and C were not verified.** I dispatched two web research passes this session —
   one on Lean 4 coinduction realization options (QpfTypes state, Mathlib M-types, native
   coinduction RFCs, `partial_fixpoint`, Aeneas's divergence encoding, any Lean ITree port) and
   one on the ITrees/ctrees primary literature. **Neither returned before this report was
   written.** Consequences, so nobody mistakes inherited data for fresh data:
   - QpfTypes' current repo state, toolchain support, and **Mathlib dependency are unconfirmed**
     (§3.4 Option B says so in place).
   - Mathlib's M-type module paths in Option C are from memory, not from inspection.
   - §3.6's three rows are the prior sweep's observations at the prior sweep's dates, not
     re-checked. A newer Lean ITree effort could exist and I would not have seen it.
   - §2's Coq signatures are, by compensation, *stronger* than paper-sourced: every one is read
     from the pinned `coq-itree 5.2.1` sources in the annex, with `file:line` against that pin.
     The paper-level claims in §2.4 and the ecosystem tables are the inherited ones.
   Anyone acting on §3.4's B/C rows or §3.6 should re-run those checks first.
8. **The `Conforms` probe used fuel, not guardedness.** §2.1(i) says so. The guarded, fuel-free
   version is standard but I did not build it, so "the entity store's `mu` needs no coinduction"
   is measured in the fuel form and argued in the guarded form.
9. **I did not run anything in the annex beyond `verify` and `smoke`.** No ITree proof was
   compiled, no lemma checked. §2's Coq citations are *reads of source at the pin*, not
   re-verifications.

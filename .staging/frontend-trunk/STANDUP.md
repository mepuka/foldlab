# STANDUP — what the UI stands on

Status: **STAGED UI PLAN — pre-grade**. Written 2026-08-30 on the
operator's pivot back to practical UI concerns ("pin on the meaning /
category-theory research and return to the practical"). The research
is pinned where it stands ([RESEARCH.md](RESEARCH.md), asks J10 and
the theorem backlog paused, nothing overwritten). This file is the
ranked answer to "what else is worth formalizing so I'm ready to
stand up a UI" — and the rule of the whole page is: **formalize the
laws, not the arithmetic.**

## The stack, bottom to top

1. **Names — DONE.** `names.json` emitted from `manifestV0`; every
   column/block/field/edge has its derived string; semantic aliases
   are app-side overlays keyed by derived strings
   ([COLUMNS.md](COLUMNS.md)).
2. **Queries = views — LANDS TODAY.** `Word.View`
   (`Cas/IR/View.lean`): a view IS a monoid homomorphism from the
   word — carrier, `merge`, `empty`, and the two laws; `run_append`
   IS incremental render. First inhabitants: `column`,
   `unregistered`, `height` (the hypotenuse's sort key), `prod` (a
   component reading two queries is one view). A **component** is a
   NAMED view plus a channel assignment (GEOMETRY.md's six-field
   spec); naming and channels deliberately stay outside the
   structure. Relational views (reachability etc.) grow via the
   rules-as-spec emission (store-crdt.md), not here.
3. **LLM calls = string transformers — LANDS TODAY.** `Rewriter`
   (`Cas/Grammar/Rewriter.lean`): `String → String`, a NEW kind
   beside `Judge`, which is untouched by operator order — verdicts
   SELECT, rewrites PRODUCE. Pipelines are `andThen` with
   associativity and identity as rfl-theorems; **`Into Q`** is the
   schema-forced-output law (the luna harness's constrained calls,
   as algebra — "returns a canonical schema" is `Into (schema Q)`);
   `Preserves` is invariant maintenance; **`Idempotent`** is the
   canonicalizer's law, with CX-003 in the docstring (the estate's
   historical canon defect was an involution where an idempotent was
   required). App-architecture reading, which is the operator's whole
   point: **at the host an LLM call is an async string transformer
   and nothing special** — ordinary Effect async, composed like any
   function, receipted like any call; the pin and visibility
   disciplines (decisions 36d/36f) attach to real instances, not to
   the type.
4. **Geometry — laws in Lean on demand, arithmetic in TS now.** The
   honest formal shape of Regime-A layout is a measured-monoid
   homomorphism (`layout (w ++ δ) = layout w ⋄ shift(extent w,
   layout δ)` — the finger-tree "measured" shape); it is ONE theorem
   when wanted, and not before. What TS owes for standup: **one
   layout engine** consuming the six-field view spec (classifier,
   order ruling, regime, cut cadence, DOI params, channel
   assignment); positions a pure function of (spec, cut); animation
   ONLY at cut transitions (critically damped springs; object
   constancy per the Heer–Robertson row of GEOMETRY.md's survey);
   the elision formula (DOI) with its two knobs. Nothing else. The
   canvas math is arithmetic under laws already stated — do not Lean
   it.
5. **Interactions — the next arc, already half-built.** "Letting the
   user apply the language to execute actions and effects" is the
   program plane the store already has: programs ARE content
   (`step`/`cont`; `putProgram`/`runProgramAt`; today's word laws
   and WF gates). The UI work there is a program-builder view and a
   run surface; the formal work is DONE. Open that arc after the
   read-only trunk renders.

## The app picture in one paragraph

The host (Effect-TS) is a store client plus served projections. Views
subscribe to per-column deltas — `column_append` is the license to
patch, never re-render. Rewriter pipelines are plain async function
composition with receipts. Judges are Bool instruments under
decision 36: human anchor, no model-on-model loops, finite panels,
visibility for the human, blinding for the large model. The UI
re-proves nothing: it consumes `names.json`, `manifest.json`, the
view laws, and the cut clock.

## Worth formalizing NEXT (on demand, in order)

0. Grammar-scoped, rate-indexed compositionality (`JudgeRate`:
   finite fragment from `names.json`, computable defect,
   `CompositionalAt`, ε=0 recovery) — operator-sparked, design banked
   in [JUDGE.md](JUDGE.md); queued behind the in-flight
   Rewriter/View landing.
1. The measured-monoid layout law (Regime-A append-extension:
   positions immutable) — when the layout engine lands.
2. Noninterference of the blind feed (decision 36e) — when the
   large-model feed is built.
3. The white-box NLP tier's first two functions (co-occurrence as a
   fold; similarity as arithmetic on it) as `Word.View` instances —
   when panels need feeding (decision 36g).
4. The T-J theorem backlog / RUN-003 — paused with the research pin.

## Ruling asks

- **S1**: adopt `Rewriter` and `Word.View` as the UI's two
  program-facing kinds (landed uncommitted; the commit ratifies).
- **S2**: freeze the six-field view-spec FIELD NAMES now
  (classifier, order, regime, cadence, doi, channels) so the TS
  types can be generated and the spec becomes data before the engine
  is written? **Frozen 2026-08-30 as proposed** — the spec record:

  ```
  ViewSpec := {
    classifier : string   -- names a registered classifier (sorts default)
    order      : string[] -- the ruled left→right column order
    regime     : "absolute" | "normalized"
    cadence    : number   -- cut cadence, ms; ignored under absolute
    doi        : { r: number, focusWeight: number }  -- compression knob + focus
    channels   : record<string, string>  -- observation → visual variable
  }
  ```

  Emission of its schema triple rides the `emitmeta` machinery once
  the meta-schema lane lands (a `ViewSpec` shape in MetaShapes is
  the natural follow-on); the layout engine consumes the decoded
  spec and nothing else.

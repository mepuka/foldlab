# Effect conventions — where the authority lives

This file exists because agent skills reference it by name. It is a
pointer, not a second authority: **the reference for Effect code and
idioms in this repository is the vendored, pinned Effect source** —
ruled by the operator 2026-08-17.

## The authorities, in order

1. **`repos/effect/`** — the exact `effect@4.0.0-rc.108` release,
   vendored as a git subtree (AGENTS.md §Effect v4). Read
   `repos/effect/LLMS.md` and `repos/effect/ai-docs/` for orientation,
   then the module sources under `repos/effect/packages/effect/src/`
   as the exemplar for any module you write. Before writing a new
   module, read a neighboring one in the vendored source.
2. **`node_modules/effect/dist/*.d.ts`** — confirm every API signature
   here (after `bun install`), never from memory and never from web
   documentation; npm's unqualified `latest` tracks Effect v3 and is
   wrong for this repository.
3. **`docs/design/2026-08-17-plait-architecture.md`** — for
   `packages/plait`, the binding statement of which Effect conventions
   are adopted and where Plait deviates.

## The conventions in one breath

One concept per flat module file; services live in their concept's
module as `Context.Service` classes with static layers;
implementation hides in `internal/`; experimental surfaces ship under
`unstable/` and promote by moving; `Effect.gen` + named `Effect.fn`
for effectful code; all validation through `effect/Schema`
(constrained decode — a decoder that repairs its input names a
different value); errors are tagged refusal values on the error
channel, never throws across a seam; `Scope` owns every lifecycle; no
ambient state. When in doubt, the vendored source outranks this
summary.

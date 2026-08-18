---
name: estate-api-development
description: The estate's API development discipline — every public surface (TypeScript API, MCP tool schema, CLI command, SDK method, prose doc) is a projection of the one language algebra core, generated not hand-written, judged by the one door, idiomatic Effect throughout. Use whenever designing, implementing, or reviewing any API, public function, tool schema, command-line surface, wire format, or SDK in this estate; whenever writing a seat ticket that touches a public surface; and whenever the user says "new API", "expose this", "add a tool/command", "public surface", or asks whether an interface is lawful. Misadherence to these principles is a high-severity finding in every review.
---

# Estate API development

The ruling this skill encodes (operator, 2026-08-18): **all APIs flow
from the same language algebra core.** A public surface is never a
thing you write; it is a picture of the algebra you generate. When the
human's documentation, the machine's code, and the model's tool list
are all pictures of one source, they agree by construction — agreement
stops being maintained and starts being inherited.

## The five laws

1. **One source, many projections.** The algebra core (the eight
   generators, the corpus, the cataloged declarations) is the single
   source. TypeScript types, JSON tool schemas, CLI command trees,
   prose docs are PROJECTIONS of it. A hand-written surface is a
   temporary sketch and must say so — and it owes a generator plus a
   byte-compare wall (served-equals-derived). A hand-maintained twin
   of the grammar is refused the way a hand-written tool list is.
2. **One door.** All input judgment routes through the one admission
   seam. No API validates privately — a private validator is a second
   door and a drift surface. Refusal parity everywhere: failed
   judgment returns a refusal carrying reason · law · repair, never a
   bare error, never a thrown exception.
3. **Effect first-class.** Idiomatic Effect is unity with the
   algebra, not a style preference: services via Context/Layer (never
   constructed inline), typed errors end to end, combinators over
   hand-rolled control flow, Scope for resources, @effect/cli for
   command-line surfaces. Misadherence is a high-severity estate faux
   pas — flag it as such in reviews, fix it as such in designs.
4. **Rung⇒carrier typing.** Any API that reads or aggregates data
   declares its algebra's rung, and the rung types which plane it may
   read (idempotent+commutative → set plane; counting → multiset;
   positional → sequences with positioned anchors). Carrier misuse
   should be a compile error, not a review catch.
5. **Plane-layered placement.** New surface code lands in its layer —
   truth / kernel / planes / carriage / surface — importing only
   itself and deeper layers. If a function's layer is unclear, its
   design is unclear.

## The admission test

Before any new public function, command, or tool ships, answer these
in writing (in the PR body or design note). An answer of "none" or
"hand-written" doesn't fail the test — it labels a sketch and files
the debt:

1. Which algebraic expression does this surface name? (Which
   generators compose to it?)
2. Which generator emits its projection, and which wall proves the
   projection matches? (If none yet: say "sketch", cite the owed wall.)
3. Which door judges its inputs, and which refusals does it teach?
4. Which rung does its read live at, and which carrier does that
   license?
5. Which layer does it live in, and does its import direction hold?
6. Is every Effect idiom in place (Layers, typed errors, no side-door
   control flow)?

Read `references/principles.md` for the distilled principles with
their citations before applying the test to unfamiliar territory.

## Including this in seat tickets

When authoring a board ticket that touches any public surface, paste
the admission test into the ticket description and cite this skill's
path (`.claude/skills/estate-api-development/`) plus the current
authorities: the kernel algebra record's one-AST section, the
projections (`verify/kernel/projections/`), and the plane-reorg spec.
Seats don't load skills — the ticket text is how the discipline
reaches them, so the ticket carries the test verbatim, not a pointer
alone.

---
name: implement
description: Proof-driven implementation for the foldlab estate — an algebraic contract and its falsification equations are written and turned into a failing test battery BEFORE any implementation, by a different process than the one that implements. Use for every piece of development work in this repo, whenever a spec, ticket, lane, or slice is handed over to build.
---

# Implement — the proof-driven loop

This page is a projection of the process ruled 2026-08-30; the letter
of the debt object, the degree rule, and the obligation classes lives
in [CONTRACT.md](CONTRACT.md), the API meaning in [API.md](API.md),
the adopted vocabulary and every reference in
[VOCABULARY.md](VOCABULARY.md), and the design basis in
[PROOF-DRIVEN-DEVELOPMENT.md](../../../.staging/operational-structure/PROOF-DRIVEN-DEVELOPMENT.md).

**The point is the host.** All of this exists to generate better
TypeScript — code that lets us do more, express more, and be more
confident. A law that cannot reach the host through a byte/word gate
or an executable falsifier buys nothing and does not belong in the
packet. No soundness word ever attaches to host code (estate C5).

## Two roles, never one

The one who writes the contract and tests — the **breaker** — is not
the one who implements. Two different processes, completely. A single
session may not play both roles for the same piece of work; the
packet is the only thing that crosses between them. Each role has its
own catalog, built from the book: [BREAKER.md](BREAKER.md) — error
states and falsifier shapes per category;
[IMPLEMENTER.md](IMPLEMENTER.md) — discharge patterns per category;
[CATALOG.md](CATALOG.md) — the section-by-section tagging of the book
both are distilled from.

## Phase S — Break (produces the contract packet)

1. **Algebraic description.** State the work itself in algebra, to
   as much a degree as possible — invariant preservation,
   homomorphism squares, round-trips, unit/composition laws, frame
   conditions. Even one state formula forces the reasoning that
   leads to good falsification attempts; there is no rigor ranking
   — the degree is what the work's algebra supports, and the packet
   declares it ("I can implement to this degree").
2. **Falsification equations.** For every law, the refutation shape,
   as an equation: "exhibit `x` with `decode(encode(x)) ≠ x` and the
   claim is dead." The stance is total: *this is the only way — if
   you prove this, I'll admit I'm wrong.* A law with no executable
   falsifier is not admitted into the packet.
3. **The battery.** Each falsification equation becomes a unit or
   property test on the host (vitest), written NOW, red by
   construction — the implementation does not exist. The battery is
   the question "have we actually proven it as written?" made
   executable, and it shows the implementer exactly what to test.
4. **Package and hand over.** The headings — CATEGORIES (assigned
   at dispatch; they trigger the catalog and book-section lookup) /
   REQUIRES / ENSURES / DECREASES / FRAME / FALSIFIER — plus
   battery file paths and the declared degree. Format and worked
   example in [CONTRACT.md](CONTRACT.md).

## Phase I — Implement (consumes the packet)

- Receive the packet. The contract and the battery are read-only: a
  defect in either is a BLOCK back to the specifier, in writing —
  never an edit.
- Develop until the battery is green. The packet shows what to test;
  then you can just develop it. One vertical slice at a time,
  typecheck often, full gate once at the end (`mise run check`).
- The loop: when implementation reveals a gap in the algebra, it
  goes back to Phase S — tighten the description, add falsifiers,
  new red tests — then Phase I resumes. Never patch the spec from
  inside the implementation.

## Escalation — when the algebra becomes Lean

When the surface is generated or store-law (representation strata
1–2), the algebraic description escalates into a Lean statement and
the gates carry it: byte equality for generated surfaces, word
equality of recorded runs for conformance (R5), per
[CONTRACT.md](CONTRACT.md) §Escalation. Host plumbing stays under the
battery and trust statements.

## Standing rules this skill inherits

Estate conduct (C1–C7) and the store-language rulings bind both
phases — load `estate` and `store-language` alongside this skill.
Scope is the ticket; blocking is doing the job; closing follows the
board register (`board-style`). Nothing here overrides a ratified
ruling; where this page and AGENTS.md disagree, AGENTS.md wins.

# Foldlab

A formal-semantics laboratory over the Effect TypeScript ecosystem.

## Thesis

LLMs plus automated verification are collapsing the cost of verifiable,
content-addressed software artifacts. Advantage accrues to whoever coalesces
the linkages — canonical forms, projections, contracts, and the tooling between
them — that let more advanced abstractions be built and trusted. Foldlab
builds at that altitude, and intends to prove that marrying Lean (as referee)
with an Effect implementation in TypeScript (as substrate) works.

## Programme

The lab organizes its subject as a descriptive tower, each layer reifying the
one below as a first-class object: host execution, effectful computation (the
Effect value), description in the small (Schema as codec, refinement,
effectful operator, and reified AST), interaction (sessions, global types,
topology), meta-interaction (protocols of protocols), and ontology
(canonicalization and growth of vocabularies).

The central principle is verification-achievability: authoring at the global
level and deriving local artifacts by projection makes verification tractable —
the global object is small and declarative, and projection theorems transport
its verification to everything derived from it.

Development is ground-up and cooperative: first a formal description of the
Effect core, then Schema as the smallest contract object, then the climb to
many-roled asynchronous interaction.

Everything the lab produces is a typed artifact with an identity and declared
transformations — the functional discipline applies to the lab's own outputs,
not just its subject matter.

## References

- Li-yao Xia, *Executable Denotational Semantics with Interaction Trees*, PhD
  dissertation, University of Pennsylvania, 2022.
- Kohei Honda, Nobuko Yoshida, Marco Carbone, *Multiparty Asynchronous Session
  Types*, Journal of the ACM 63(1), 2016.
- [Unison](https://www.unison-lang.org/) — inspiration: content-addressed
  definitions, code as data, effects as abilities; open, simple, rigorous
  roots betting on the same principles.
- Federico Carrone, [Concrete: Proving Systems Code in
  Lean](https://federicocarrone.com/series/concrete/proving-systems-code-in-lean/)
  — under study: a systems language whose Core IR is Lean inductive types,
  with proofs fingerprinted to code versions.

## Layout

- [CHARTER.md](CHARTER.md) — thesis, philosophy, programme, roadmap.
- [AGENTS.md](AGENTS.md) — agent specification: conduct, procedures, routing.
- [docs/](docs/) — bounded-context glossaries, claim gates, invariants.
- [.reference/](.reference/) — evidence: source lock, catalog, study clones.
- [formal/](formal/) — formal verification artifacts (Lean, claim-gated).
- [experiments/](experiments/) — experimental artifacts.

Toolchains and tasks run through [mise](https://mise.jdx.dev/): `mise run
check` regenerates derived files, asserts a clean tree, and runs the gates —
locally and in CI alike.

## License

Code is licensed under Apache-2.0 ([LICENSE](LICENSE)); documents under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Status

Descriptive phase. No formal claims selected yet; the claim vocabulary lives
in
[CLAIM-GATES.md](docs/effect-typescript-semantics/CLAIM-GATES.md).
